import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, ArrowLeft, ArrowRight, Pause, Play, Check, LoaderCircle } from 'lucide-react';
import { Chapter } from './Primitives';
import { RATING_REPLIES } from '../data';
import { useReviewRail } from '../hooks/useReviewRail';
type Review={id:string;name:string;stars:number;comment:string;createdAt:string;demo?:boolean};
type ReplyData={author?:string;reply:string;date?:string};
type Snapshot={configured:boolean;count:number;average:number;reviews:Review[];replies?:Record<string,ReplyData>;challenge:string};
const examples:Review[]=[];
const empty:Snapshot={configured:false,count:0,average:0,reviews:[],challenge:''};
import fallbackRatings from '../../shared/real-ratings.json';
const defaultRealSnapshot: Snapshot = {
  configured: true,
  count: fallbackRatings.count,
  average: fallbackRatings.average,
  reviews: fallbackRatings.reviews as Review[],
  challenge: ''
};
function newID(){if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const s=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;}
function Star({filled=false}:{filled?:boolean}){return <svg viewBox="0 0 32 32" className={filled?'rating-star filled':'rating-star'} aria-hidden="true"><path d="m16 3 4 8.1 9 1.3-6.5 6.3 1.5 9L16 23.5l-8 4.2 1.5-9L3 12.4l9-1.3Z"/></svg>;}

function OwnerReply({ reply }: { reply: ReplyData }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`owner-reply-wrapper ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="owner-reply-toggle"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(v => !v);
        }}
        aria-expanded={open}
      >
        <span className="owner-toggle-label">Tanggapan owner</span>
        <span className="owner-toggle-icon" aria-hidden="true">+</span>
      </button>
      <div className="owner-reply-collapse">
        <div className="owner-reply-inner">
          <div className="owner-reply-box">
            <div className="owner-reply-header">
              <span className="owner-badge">{(reply.author || 'R_HMT').replace(/\s*\(Owner\)/i, '')}</span>
              {reply.date && <time className="owner-reply-date">{reply.date}</time>}
            </div>
            <p className="owner-reply-text">{reply.reply}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function Ratings({paused=false}:{paused?:boolean}){
  const [snapshot,setSnapshot]=useState<Snapshot>(defaultRealSnapshot),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false);
  const [name,setName]=useState(''),[comment,setComment]=useState(''),[stars,setStars]=useState(0),[hover,setHover]=useState(0),[website,setWebsite]=useState('');
  const [replies, setReplies] = useState<Record<string, ReplyData>>(RATING_REPLIES || {});

  // Admin Mode State
  const [adminPin, setAdminPin] = useState<string>(() => {
    try {
      return localStorage.getItem('r_hmt_admin_pin') || localStorage.getItem('rhmt_admin_key') || '';
    } catch {
      return '';
    }
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  // Admin Inline Action State
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const displayed=[...snapshot.reviews];
  const {rail,auto,setAuto,move,hold}=useReviewRail(displayed.length,paused);
  const client=useRef(''),lock=useRef(false),pending=useRef<{id:string;value:string}|null>(null),abort=useRef<AbortController|null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  }

  async function load(signal?:AbortSignal){
    setLoading(true);
    const controller=new AbortController();abort.current=controller;const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});const timeout=setTimeout(cancel,12000);
    try{
      const response=await fetch(`/api/ratings?client=${encodeURIComponent(client.current)}`,{signal:controller.signal,cache:'no-store'});
      const body=await response.json();
      if(!response.ok){
        if(body.configured===false){setSnapshot(empty);setError('');return;}
        throw new Error(body.error||'Rating belum dapat dimuat.');
      }
      if(!Array.isArray(body.reviews)||typeof body.challenge!=='string')throw new Error('Rating belum dapat dimuat.');
      setSnapshot(body);
      if(body.replies && typeof body.replies === 'object') {
        setReplies(prev => ({ ...prev, ...body.replies }));
      }
      setError('');
    }
    catch(e){if(!signal?.aborted)setError(controller.signal.aborted?'Rating terlalu lama dimuat. Coba lagi.':e instanceof Error?e.message:'Koneksi terputus.');}
    finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);if(!signal?.aborted)setLoading(false);}
  }

  useEffect(()=>{
    let id='';try{id=localStorage.getItem('rhmt-rating-client')||'';}catch{}
    if(!/^[0-9a-f-]{36}$/i.test(id)){id=newID();try{localStorage.setItem('rhmt-rating-client',id);}catch{}}
    client.current=id;
    try{const at=Number(localStorage.getItem('rhmt-rating-sent')||0);setSent(Date.now()-at<86400000&&at>0);}catch{}
    const controller=new AbortController();abort.current=controller;void load(controller.signal);

    // Verify existing admin pin
    let savedPin = '';
    try {
      savedPin = localStorage.getItem('r_hmt_admin_pin') || localStorage.getItem('rhmt_admin_key') || '';
    } catch {}
    if (savedPin) {
      fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': savedPin },
        body: JSON.stringify({ action: 'verify' })
      })
        .then(r => r.json())
        .then(d => {
          if (d && d.authenticated) {
            setAdminPin(savedPin);
            setIsAdmin(true);
          }
        })
        .catch(() => {});
    }

    return()=>{controller.abort();abort.current?.abort();};
  },[]);

  async function handleAdminLogin(e: FormEvent) {
    e.preventDefault();
    const pin = loginPin.trim();
    if (!pin) return;
    setLoginBusy(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': pin },
        body: JSON.stringify({ action: 'verify' })
      });
      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        throw new Error(data.error || 'PIN / Secret Key admin salah.');
      }
      try {
        localStorage.setItem('r_hmt_admin_pin', pin);
        localStorage.setItem('rhmt_admin_key', pin);
      } catch {}
      setAdminPin(pin);
      setIsAdmin(true);
      setShowLoginModal(false);
      setLoginPin('');
      showToast('Mode admin aktif! Tuan dapat membalas, mengedit, atau menghapus komentar.');
    } catch (err: any) {
      setLoginError(err.message || 'Gagal login admin.');
    } finally {
      setLoginBusy(false);
    }
  }

  function handleLogoutAdmin() {
    if (!confirm('Keluar dari mode admin?')) return;
    try {
      localStorage.removeItem('r_hmt_admin_pin');
      localStorage.removeItem('rhmt_admin_key');
    } catch {}
    setAdminPin('');
    setIsAdmin(false);
    setActiveReplyId(null);
    showToast('Mode admin dinonaktifkan.');
  }

  function handleOpenReply(rId: string) {
    hold();
    if (activeReplyId === rId) {
      setActiveReplyId(null);
      setReplyText('');
    } else {
      setActiveReplyId(rId);
      const existing = replies[rId] || (RATING_REPLIES && RATING_REPLIES[rId]);
      setReplyText(existing?.reply || '');
    }
  }

  async function submitReply(rId: string) {
    if (!replyText.trim() || !adminPin) return;
    setAdminBusy(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminPin },
        body: JSON.stringify({
          action: 'reply_rating',
          ratingId: rId,
          replyText: replyText.trim(),
          author: 'R_HMT'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan tanggapan.');
      const newReply: ReplyData = {
        author: 'R_HMT',
        reply: replyText.trim(),
        date: new Date().toISOString().split('T')[0]
      };
      setReplies(prev => ({ ...prev, [rId]: newReply }));
      setActiveReplyId(null);
      setReplyText('');
      showToast('Tanggapan berhasil disimpan!');
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan tanggapan.');
    } finally {
      setAdminBusy(false);
    }
  }

  async function handleDeleteReply(rId: string) {
    hold();
    if (!confirm('Hapus tanggapan Tuan pada komentar ini?')) return;
    setAdminBusy(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminPin },
        body: JSON.stringify({ action: 'delete_reply', ratingId: rId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus tanggapan.');
      setReplies(prev => {
        const copy = { ...prev };
        delete copy[rId];
        return copy;
      });
      showToast('Tanggapan berhasil dihapus.');
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus tanggapan.');
    } finally {
      setAdminBusy(false);
    }
  }

  async function handleDeleteReview(rId: string, authorName: string) {
    hold();
    if (!confirm(`Hapus komentar dari "${authorName}" secara permanen?`)) return;
    setAdminBusy(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminPin },
        body: JSON.stringify({
          action: 'delete_rating',
          ratingId: rId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus komentar.');
      setSnapshot(prev => ({
        ...prev,
        count: Math.max(0, prev.count - 1),
        reviews: prev.reviews.filter(rev => rev.id !== rId)
      }));
      setReplies(prev => {
        const copy = { ...prev };
        delete copy[rId];
        return copy;
      });
      showToast('Komentar berhasil dihapus!');
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus komentar.');
    } finally {
      setAdminBusy(false);
    }
  }
  async function submit(e:FormEvent){
    e.preventDefault();if(lock.current||!snapshot.configured||sent)return;
    if(!stars){setError('Pilih jumlah bintang dulu.');return;}
    if(!name.trim()){setError('Isi nama kamu dulu.');document.getElementById('rating-name')?.focus();return;}
    lock.current=true;setBusy(true);setError('');
    const value=JSON.stringify([name.trim(),stars,comment.trim()]);if(pending.current?.value!==value)pending.current={id:newID(),value};
    const controller=new AbortController();abort.current=controller;const timeout=setTimeout(()=>controller.abort(),12000);
    try{const response=await fetch('/api/ratings',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({name:name.trim(),stars,comment:comment.trim(),website,client:client.current,requestId:pending.current.id,challenge:snapshot.challenge})});const body=await response.json();if(!response.ok){if(body.code==='REFRESH')await load();throw new Error(body.error||'Rating belum tersimpan.');}if(body.accepted!==true||!body.review)throw new Error('Rating belum tersimpan.');setSnapshot(s=>({...s,count:body.count,average:body.average,reviews:[body.review,...s.reviews.filter(r=>r.id!==body.review.id)].slice(0,20)}));setSent(true);try{localStorage.setItem('rhmt-rating-sent',String(Date.now()));}catch{}}
    catch(e){setError(controller.signal.aborted?'Koneksi terlalu lama. Coba kirim lagi; rating yang sama tidak akan dihitung dua kali.':e instanceof Error?e.message:'Rating belum tersimpan.');}finally{clearTimeout(timeout);lock.current=false;setBusy(false);}
  }
  return <section className="ratings section-pad" id="rating" aria-labelledby="rating-title"><div className="wrap"><Chapter number="09">A NOTE FROM YOU</Chapter><div className="rating-layout"><div className="rating-intro"><h2 id="rating-title">How did it feel?<br/><em>Kasih sedikit kesan.</em></h2><p>Nama, beberapa bintang, dan kalau mau, satu dua kalimat. Aku baca sebagai bahan belajar.</p></div>
    <form className="rating-form" onSubmit={submit}><fieldset disabled={busy||!snapshot.configured||sent}><legend className="sr-only">Kirim rating portofolio</legend><div className="rating-picker" role="radiogroup" aria-required="true" aria-label="Jumlah bintang" onPointerLeave={()=>setHover(0)}>{[1,2,3,4,5].map(n=><button type="button" role="radio" aria-checked={stars===n} aria-label={`${n} bintang`} key={n} tabIndex={stars===n||(!stars&&n===1)?0:-1} onPointerEnter={()=>setHover(n)} onFocus={()=>setHover(n)} onBlur={()=>setHover(0)} onClick={()=>setStars(n)} onKeyDown={e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?1:e.key==='End'?5:Math.min(5,Math.max(1,n+(e.key==='ArrowRight'?1:-1)));setStars(next);(e.currentTarget.parentElement?.children[next-1] as HTMLButtonElement)?.focus();}}}><Star filled={n<=(hover||stars)}/></button>)}</div><label htmlFor="rating-name">Nama<span aria-hidden="true"> *</span></label><input id="rating-name" name="name" autoComplete="nickname" maxLength={50} value={name} onChange={e=>setName(e.target.value)} placeholder="Nama kamu" required/><label htmlFor="rating-comment">Komentar <small>opsional</small></label><textarea id="rating-comment" name="comment" rows={3} maxLength={600} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Apa yang paling berkesan?"/><label className="rating-trap" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" name="website" value={website} onChange={e=>setWebsite(e.target.value)}/></label><button className="button button-blue" type="submit">{busy?<><LoaderCircle className="spin" size={17}/>Mengirim…</>:<>Kirim kesan<ArrowUpRight size={17}/></>}</button></fieldset>{sent&&<p className="rating-success" role="status"><Check size={18}/>Terima kasih, kesan kamu sudah diterima.</p>}{error&&<p className="rating-error" role="alert">{error}</p>}{!loading&&!snapshot.configured&&<button type="button" className="text-link" onClick={()=>void load()}>Muat ulang rating<ArrowUpRight size={15}/></button>}<div className="rating-footer-note"><p className="rating-public-note">Nama dan komentar tampil publik. Tidak perlu email atau akun.</p>{isAdmin ? <span className="owner-auth-status">owner mode aktif • <button type="button" onClick={handleLogoutAdmin} className="owner-auth-logout">keluar</button></span> : <button type="button" onClick={()=>setShowLoginModal(true)} className="owner-auth-link">owner</button>}</div></form></div>
    {displayed.length>0&&<div className="review-carousel"><div className="review-navigation"><span>KESAN PENGUNJUNG / GESER UNTUK MEMBACA</span>{displayed.length>1&&<div><button aria-label={auto?'Jeda gerak komentar':'Aktifkan gerak komentar'} aria-pressed={!auto} onClick={()=>setAuto(v=>!v)}>{auto?<Pause size={16}/>:<Play size={16}/>}</button><button aria-label="Komentar sebelumnya" onClick={()=>move(-1)}><ArrowLeft size={18}/></button><button aria-label="Komentar berikutnya" onClick={()=>move(1)}><ArrowRight size={18}/></button></div>}</div><div className="visitor-notes" ref={rail} role="region" aria-label="Kesan pengunjung, geser horizontal" tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}else hold();}}>{displayed.map(r=>{
      const currentReply = replies[r.id] || (RATING_REPLIES && RATING_REPLIES[r.id]);
      return (
        <article className="visitor-note" key={r.id}>
          <div>
            <strong>{r.name}</strong>
            <span className="review-example" hidden={!r.demo}>Contoh</span>
            {!r.demo&&<time dateTime={r.createdAt}>{new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date(r.createdAt))}</time>}
          </div>
          <div className="visitor-stars" aria-label={`${r.stars} dari 5 bintang`}>{[1,2,3,4,5].map(n=><Star key={n} filled={n<=r.stars}/>)}</div>
          {r.comment&&<p>{r.comment}</p>}
          {currentReply && (
            <OwnerReply reply={currentReply} />
          )}

          {isAdmin && activeReplyId === r.id && (
            <div className="vnote-inline-reply" onClick={e => e.stopPropagation()}>
              <textarea
                className="vnote-reply-textarea"
                rows={2}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Tulis tanggapan Tuan..."
                autoFocus
              />
              <div className="vnote-reply-actions">
                <button
                  type="button"
                  className="vnote-text-action"
                  style={{ color: 'var(--accent)', fontWeight: 600 }}
                  disabled={adminBusy || !replyText.trim()}
                  onClick={() => submitReply(r.id)}
                >
                  {adminBusy ? 'menyimpan...' : 'simpan tanggapan'}
                </button>
                <span className="vnote-sep">•</span>
                <button
                  type="button"
                  className="vnote-text-action"
                  onClick={() => setActiveReplyId(null)}
                >
                  batal
                </button>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="vnote-bottom-actions">
              {currentReply ? (
                <>
                  <button
                    type="button"
                    className="vnote-text-action"
                    onClick={(e) => { e.stopPropagation(); handleOpenReply(r.id); }}
                  >
                    edit tanggapan
                  </button>
                  <span className="vnote-sep">•</span>
                  <button
                    type="button"
                    className="vnote-text-action danger"
                    onClick={(e) => { e.stopPropagation(); handleDeleteReply(r.id); }}
                    disabled={adminBusy}
                  >
                    hapus tanggapan
                  </button>
                  <span className="vnote-sep">•</span>
                  <button
                    type="button"
                    className="vnote-text-action danger"
                    onClick={(e) => { e.stopPropagation(); handleDeleteReview(r.id, r.name); }}
                    disabled={adminBusy}
                  >
                    hapus komentar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="vnote-text-action"
                    onClick={(e) => { e.stopPropagation(); handleOpenReply(r.id); }}
                  >
                    balas
                  </button>
                  <span className="vnote-sep">•</span>
                  <button
                    type="button"
                    className="vnote-text-action danger"
                    onClick={(e) => { e.stopPropagation(); handleDeleteReview(r.id, r.name); }}
                    disabled={adminBusy}
                  >
                    hapus komentar
                  </button>
                </>
              )}
            </div>
          )}
        </article>
      );
    })}</div></div>}
    {showLoginModal && (
      <div className="admin-modal-overlay" onClick={() => setShowLoginModal(false)}>
        <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
          <h3>Login Owner</h3>
          <p>Masukkan PIN untuk mengelola tanggapan atau komentar pengunjung.</p>
          {loginError && <div className="admin-modal-error">{loginError}</div>}
          <form onSubmit={handleAdminLogin}>
            <input
              type="password"
              className="admin-modal-input"
              placeholder="PIN Owner..."
              value={loginPin}
              onChange={e => setLoginPin(e.target.value)}
              autoFocus
              required
            />
            <div className="admin-modal-actions">
              <button type="submit" className="button button-blue" disabled={loginBusy || !loginPin.trim()}>
                {loginBusy ? 'Memeriksa...' : 'Masuk'}
              </button>
              <button type="button" className="button button-secondary" onClick={() => setShowLoginModal(false)}>
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    {toastMessage && (
      <div className="ratings-toast" role="status">
        <Check size={16} />
        {toastMessage}
      </div>
    )}
  </div></section>;
}
