import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

export const READ_SCRIPT = `
local function hit(key, window)
  local n=redis.call('INCR',key)
  if n==1 then redis.call('PEXPIRE',key,window) end
  return n
end
if hit(KEYS[1],60000)>60 or hit(KEYS[2],60000)>500 then return {0,0,0,{},60000} end
return {1,tonumber(redis.call('HGET',KEYS[3],'sum') or '0'),tonumber(redis.call('HGET',KEYS[3],'count') or '0'),redis.call('LRANGE',KEYS[4],0,19),0}
`;
export const WRITE_SCRIPT = `
local function typ(key)
  local t=redis.call('TYPE',key)
  if type(t)=='table' then return t.ok end
  return t
end
for i=1,8 do
  local t=typ(KEYS[i])
  local wanted=i==5 and 'hash' or (i==6 and 'list' or 'string')
  if t~='none' and t~=wanted then return redis.error_reply('INVALID_STORAGE') end
end
local sum=tonumber(redis.call('HGET',KEYS[5],'sum') or '0')
local count=tonumber(redis.call('HGET',KEYS[5],'count') or '0')
if not sum or not count or sum<0 or count<0 or sum%1~=0 or count%1~=0 then return redis.error_reply('INVALID_STORAGE') end
for _,i in ipairs({2,4,8}) do
  local raw=redis.call('GET',KEYS[i])
  local n=tonumber(raw or '0')
  if not n or n<0 or n%1~=0 then return redis.error_reply('INVALID_STORAGE') end
end
local attempts=redis.call('INCR',KEYS[8])
if attempts==1 then redis.call('PEXPIRE',KEYS[8],600000) end
if attempts>12 then return {0,sum,count,'',math.max(1000,redis.call('PTTL',KEYS[8]))} end
local previous=redis.call('GET',KEYS[7])
if previous then
  if string.sub(previous,1,64)~=ARGV[3] then return {2,sum,count,'',0} end
  return {1,sum,count,string.sub(previous,66),0}
end
if redis.call('EXISTS',KEYS[1])==1 then return {0,sum,count,'',math.max(1000,redis.call('PTTL',KEYS[1]))} end
if redis.call('EXISTS',KEYS[3])==1 then return {0,sum,count,'',math.max(1000,redis.call('PTTL',KEYS[3]))} end
if tonumber(redis.call('GET',KEYS[2]) or '0')>=3 then return {0,sum,count,'',math.max(1000,redis.call('PTTL',KEYS[2]))} end
if tonumber(redis.call('GET',KEYS[4]) or '0')>=500 then return {0,sum,count,'',math.max(1000,redis.call('PTTL',KEYS[4]))} end
local stars=tonumber(ARGV[2])
if not stars or stars<1 or stars>5 or stars%1~=0 then return redis.error_reply('INVALID_RATING') end
redis.call('SET',KEYS[1],'1','PX',600000)
redis.call('SET',KEYS[3],'1','PX',86400000)
for _,i in ipairs({2,4}) do
  local n=redis.call('INCR',KEYS[i])
  if n==1 then redis.call('PEXPIRE',KEYS[i],86400000) end
end
sum=redis.call('HINCRBY',KEYS[5],'sum',stars)
count=redis.call('HINCRBY',KEYS[5],'count',1)
redis.call('LPUSH',KEYS[6],ARGV[1])
redis.call('LTRIM',KEYS[6],0,249)
redis.call('SET',KEYS[7],ARGV[3]..'|'..ARGV[1],'PX',86400000)
return {1,sum,count,ARGV[1],0}
`;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PREFIX='rhmt:{ratings}:v23:';
const CONTROL=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
export function validateRating(body) {
  if(!body||typeof body!=='object'||Array.isArray(body))return null;
  const optionalComment=body.comment??'';
  if(typeof body.name!=='string'||typeof optionalComment!=='string'||!Number.isInteger(body.stars)||body.stars<1||body.stars>5)return null;
  const name=body.name.normalize('NFC').trim().replace(/\s+/g,' '),comment=optionalComment.normalize('NFC').trim();
  if(!name||name.length>50||comment.length>600||CONTROL.test(name+comment)||!UUID.test(body.client||'')||!UUID.test(body.requestId||'')||typeof body.challenge!=='string')return null;
  if(typeof body.website!=='string'||body.website!=='')return null;
  return {name,comment,stars:body.stars,client:body.client.toLowerCase(),requestId:body.requestId.toLowerCase(),challenge:body.challenge};
}
const hmac=(secret,value)=>createHmac('sha256',secret).update(value).digest('hex');
function clientIp(req) {return String(req.headers?.['x-vercel-forwarded-for']||req.headers?.['x-real-ip']||req.ip||req.socket?.remoteAddress||'unknown').split(',')[0].trim().slice(0,128);}
export function sameOrigin(req) {
  if(req.headers?.['sec-fetch-site']==='cross-site')return false;
  const origin=req.headers?.origin;
  if(typeof origin!=='string'||origin==='null')return false;
  try {const url=new URL(origin);const host=String(req.headers?.host||'').toLowerCase();const local=['localhost','127.0.0.1','terminal.local'].includes(url.hostname);return url.host.toLowerCase()===host&&(url.protocol==='https:'||(local&&url.protocol==='http:'));}catch{return false;}
}
export function signChallenge(secret,ip,client,now) {const data=`${now}.${randomUUID()}`;return `${data}.${hmac(secret,`${ip}|${client}|${data}`)}`;}
export function validChallenge(token,secret,ip,client,now) {
  if(typeof token!=='string'||token.length>180)return false;
  const [timestamp,nonce,signature,...extra]=token.split('.');const age=now-Number(timestamp);
  if(extra.length||!UUID.test(nonce||'')||!/^\d{13}$/.test(timestamp||'')||!/^[0-9a-f]{64}$/.test(signature||'')||age<0||age>1800000)return false;
  const expected=Buffer.from(hmac(secret,`${ip}|${client}|${timestamp}.${nonce}`),'hex');return timingSafeEqual(expected,Buffer.from(signature,'hex'));
}
function publicReview(raw) {
  try {const r=typeof raw==='string'?JSON.parse(raw):raw;if(!r||!UUID.test(r.id||'')||typeof r.name!=='string'||!r.name||r.name.length>50||typeof r.comment!=='string'||r.comment.length>600||!Number.isInteger(r.stars)||r.stars<1||r.stars>5||!Number.isFinite(Date.parse(r.createdAt)))return null;return {id:r.id,name:r.name,comment:r.comment,stars:r.stars,createdAt:r.createdAt};}catch{return null;}
}
export function createRatingsHandler({fetchImpl=fetch,now=Date.now,env=process.env}={}) {
  async function evaluate(script,keys,args=[]) {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),6500);
    try {
      const response=await fetchImpl(env.UPSTASH_REDIS_REST_URL,{method:'POST',headers:{Authorization:`Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(['EVAL',script,keys.length,...keys,...args]),signal:controller.signal});
      if(!response.ok)throw new Error('STORAGE');const text=await response.text();if(text.length>150000)throw new Error('SIZE');const body=JSON.parse(text);
      if(body.error||!Array.isArray(body.result)||body.result.length!==5)throw new Error('STORAGE');return body.result;
    } finally {clearTimeout(timeout);}
  }
  return async function handler(req,res) {
    res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
    if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Metode tidak didukung.'});}
    let rating;
    if(req.method==='POST') {
      if(!sameOrigin(req))return res.status(403).json({error:'Permintaan tidak diizinkan.'});
      if(!String(req.headers?.['content-type']||'').toLowerCase().startsWith('application/json'))return res.status(415).json({error:'Gunakan format JSON.'});
      if(Number(req.headers?.['content-length'])>4096||Buffer.byteLength(JSON.stringify(req.body||{}))>4096)return res.status(413).json({error:'Pesan terlalu panjang.'});
      rating=validateRating(req.body);if(!rating)return res.status(400).json({error:'Isi nama, pilih 1–5 bintang, dan batasi komentar hingga 600 karakter.'});
    }
    const fallbackReviews = [{"id":"baf0e94c-a2c1-4e51-8e57-464493eb4a4d","name":"Zain","comment":"Gokil🗿","stars":5,"createdAt":"2026-10-26T09:53:24.694Z"},{"id":"376cc849-38c2-40f5-9928-bb09d1da09af","name":"Bayu","comment":"Keren rhmat, dulu lu masih tanya tanya sekarang skill mu udah di atas kuuu ajaaa, semangat buat rhmat sekarang udahhh gkkkk manggl sepuh sepuh lg yhhhh","stars":5,"createdAt":"2026-10-24T10:52:16.720Z"},{"id":"444ff3ac-9a10-4a92-af22-6bb89722e6cf","name":"Mulyono suka gorong","comment":"Hhaha teruskan bakatmu anak muda","stars":5,"createdAt":"2026-10-22T00:42:28.134Z"},{"id":"9a565497-1ce6-465b-a418-4ba1afd1fdc6","name":"eleina","comment":"keren cyahhhh, watasi sangat kagum padamu mamat cyahhh","stars":5,"createdAt":"2026-10-18T01:33:07.158Z"},{"id":"967eab98-7624-46e1-ab70-b2dca227e00d","name":"Wowo","comment":"","stars":5,"createdAt":"2026-10-16T12:16:30.903Z"},{"id":"b2fdeb21-af24-44c8-aff7-dd5c7e010e5e","name":"Faixxyy","comment":"Bagus mat 😣 pengen buat juga tapi gatau caranya :v","stars":5,"createdAt":"2026-10-14T12:58:29.213Z"},{"id":"5acc8857-8442-40bb-b270-2593159ce2b3","name":"@syafiqueue","comment":"Anjai, kece bat, rate juga punyaku dong www.dya.web.id","stars":5,"createdAt":"2026-10-14T08:31:19.697Z"},{"id":"457e48e2-f93b-48b9-ac03-607d4393b0e5","name":"msbreewc","comment":"gelok","stars":5,"createdAt":"2026-10-14T07:12:41.244Z"},{"id":"cc560803-3d9b-40c3-970a-0f7940514635","name":"Sky ajalahh","comment":"Gg mat, semangatt 🔥","stars":5,"createdAt":"2026-10-13T13:29:35.667Z"},{"id":"863e9242-62c5-4725-8e9a-fd24c145cf70","name":"AhmadXyz","comment":"Jangan lupa kunjungi my web:v\nhttps://api.fuku.eu.cc","stars":5,"createdAt":"2026-10-13T12:53:34.372Z"},{"id":"acc07221-cec0-4709-b5be-d7f85842e177","name":"sang pemula biasa bernama hmmodz","comment":"Hallo Rahmat, Semangat Teruss Yaaaa💪","stars":5,"createdAt":"2026-10-11T08:47:14.188Z"},{"id":"91ed18b9-2c72-440d-920e-00aa86f0f846","name":"Tenkz","comment":"keren mat","stars":5,"createdAt":"2026-10-11T08:40:42.109Z"},{"id":"6b1d0ca8-54c7-4344-97b0-d63be0c16067","name":"-","comment":"Terjadi kesalahan saat mengambil data dari database.","stars":5,"createdAt":"2026-10-11T07:13:11.861Z"},{"id":"39083082-1b50-40ba-9ead-4421d2ccd33e","name":"ceo menyamar","comment":"kerenn porto nya mat","stars":5,"createdAt":"2026-10-11T06:05:44.905Z"},{"id":"aa88e8e8-993e-4d2c-b582-3f64a5c9be2a","name":"Prabowo","comment":"Keren Nak, Bagi Code nya nanti saya masukin ke sppg","stars":5,"createdAt":"2026-10-11T05:28:21.120Z"},{"id":"84999dea-104d-4d85-9f63-6e5364aa8716","name":"Omdii","comment":"Bagi code nya😭🗿🗿","stars":5,"createdAt":"2026-10-11T04:09:36.208Z"},{"id":"195f94c5-f7ed-4eac-afbe-bcf6103d2c73","name":"Rixky","comment":"Gg bg👍🗿","stars":5,"createdAt":"2026-10-11T02:04:29.564Z"},{"id":"080d625f-81c9-4f0d-9f18-dd61a69131e8","name":"Woss","comment":"Gayamu reng","stars":5,"createdAt":"2026-10-11T01:29:03.017Z"},{"id":"33b05028-d6a6-4d5d-aa9e-520a2bebe34a","name":"Ali","comment":"Bagus, menarik 💦","stars":5,"createdAt":"2026-10-11T00:26:46.040Z"},{"id":"682be5e4-21e1-4036-a185-359a4867968b","name":"manusia","comment":"Keren bet bang, salut gw","stars":5,"createdAt":"2026-10-11T00:04:31.263Z"}];
    const fallbackData = { configured: true, count: 25, average: 5.0, reviews: fallbackReviews, challenge: '' };

    try {
      const url=new URL(env.UPSTASH_REDIS_REST_URL||'');
      if(url.protocol!=='https:'||!url.hostname.endsWith('.upstash.io')||url.username||url.password||url.search||url.hash||!env.UPSTASH_REDIS_REST_TOKEN)throw new Error('CONFIG');
    } catch {
      if (req.method === 'GET') {
        return res.status(200).json(fallbackData);
      }
      return res.status(503).json({configured:false,error:'Rating belum tersedia.'});
    }
    const secret=env.UPSTASH_REDIS_REST_TOKEN,ip=hmac(secret,clientIp(req));
    try {
      if(req.method==='GET') {
        const query=new URL(req.url||'/api/ratings','http://localhost').searchParams;const client=String(req.query?.client||query.get('client')||'').toLowerCase();
        const result=await evaluate(READ_SCRIPT,[`${PREFIX}read:${ip}`,`${PREFIX}read:global`,`${PREFIX}summary`,`${PREFIX}reviews`]);
        const [accepted,sum,count,reviews,wait]=result;
        if(!accepted){res.setHeader('Retry-After',String(Math.ceil(wait/1000)));return res.status(429).json({error:'Tunggu sebentar sebelum memuat rating lagi.'});}
        if(!Number.isSafeInteger(sum)||!Number.isSafeInteger(count)||sum<0||count<0||!Array.isArray(reviews))throw new Error('INVALID_STORAGE');
        return res.status(200).json({configured:true,count,average:count?Math.round(sum/count*10)/10:0,reviews:reviews.map(publicReview).filter(Boolean),challenge:UUID.test(client)?signChallenge(secret,ip,client,now()):''});
      }
      if(!validChallenge(rating.challenge,secret,ip,rating.client,now()))return res.status(409).json({code:'REFRESH',error:'Sesi rating berakhir. Muat ulang rating lalu kirim lagi.'});
      const record={id:rating.requestId,name:rating.name,stars:rating.stars,comment:rating.comment,createdAt:new Date(now()).toISOString()};
      const browser=hmac(secret,rating.client);const fingerprint=hmac(secret,JSON.stringify([rating.name,rating.stars,rating.comment]));
      const result=await evaluate(WRITE_SCRIPT,[`${PREFIX}cooldown:${ip}`,`${PREFIX}daily:${ip}`,`${PREFIX}browser:${browser}`,`${PREFIX}daily:global`,`${PREFIX}summary`,`${PREFIX}reviews`,`${PREFIX}request:${browser}:${rating.requestId}`,`${PREFIX}attempts:${ip}`],[JSON.stringify(record),String(rating.stars),fingerprint]);
      const [accepted,sum,count,raw,wait]=result;
      if(accepted===2)return res.status(409).json({error:'Gunakan permintaan baru untuk rating yang berbeda.'});
      if(accepted!==1){res.setHeader('Retry-After',String(Math.max(1,Math.ceil(wait/1000))));return res.status(429).json({error:'Batas rating tercapai. Tunggu sebelum mencoba lagi.'});}
      const review=publicReview(raw);if(!review||!Number.isSafeInteger(sum)||!Number.isSafeInteger(count)||count<1)throw new Error('INVALID_STORAGE');
      return res.status(200).json({accepted:true,review,count,average:Math.round(sum/count*10)/10});
    } catch {return res.status(503).json({error:'Rating belum dapat tersimpan. Coba lagi sebentar lagi.'});}
  };
}
export default createRatingsHandler();
