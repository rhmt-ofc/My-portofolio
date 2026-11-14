import * as T from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import content from '../../shared/content.json';
import { decaySpin, fitDistance, horizontalIntent, isSceneKind, projectHit, settleFitDistance } from './spatialMath.mjs';
import { ANIME_STAGE, HERO_STAGE, JOURNEY_STAGE, JOURNEY_SHAPES, WORK_STAGE, advanceJourneyTurn, createJourneyTurn, heroFramePose, heroGroupPose, journeyCamera, journeyLayout, journeySignal, workFramePose } from './choreography.mjs';
import { makeRoomFloor } from './roomFloor';
import { ROOM_POSES, roomRoute } from './roomRoute.mjs';

type Bounds = { left: number; top: number; width: number; height: number; right: number; bottom: number };
type View = { el: HTMLElement; kind: string; scene: T.Scene; camera: T.PerspectiveCamera; group: T.Group; pointer: T.Vector2; smooth: T.Vector2; angle: number; inertia: number; assets: T.Texture[]; update: (time: number, dt: number, motion: boolean, rect: Bounds) => void; handlers: (() => void)[] };
const clamp = T.MathUtils.clamp;
const ease = (value: number) => 1 - Math.pow(1 - clamp(value,0,1), 4);
const tools = content.ECOSYSTEM.flatMap((g, group) => g.items.map((t, order) => ({ ...t, group, order, count: g.items.length })));

/** Physically lit geometry, projected hit areas, scroll-directed cameras and one WebGL context. */
export function mountWorld(host: HTMLElement) {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 unavailable');
  const renderer = new T.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
  renderer.debug.onShaderError = () => { throw new Error('WebGL shader compilation failed'); };
  let mobile = matchMedia('(max-width: 760px)').matches;
  const saveData = Boolean((navigator as any).connection?.saveData);
  let pixelRatio = Math.min(devicePixelRatio || 1, mobile || saveData ? 1.25 : 1.7);
  renderer.setPixelRatio(pixelRatio); renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.autoClear = false;renderer.info.autoReset=false;
  host.appendChild(canvas);
  const makeEnvironment = () => { const generator = new T.PMREMGenerator(renderer); const room = new RoomEnvironment(); try { return generator.fromScene(room, .05); } finally { room.dispose(); generator.dispose(); } };
  let environment: T.WebGLRenderTarget;
  try { environment=makeEnvironment(); } catch(error) { renderer.dispose();canvas.remove();throw error; }
  const normalCanvas = document.createElement('canvas'); normalCanvas.width = 128; normalCanvas.height = 128;
  const ctx = normalCanvas.getContext('2d')!; const pixels = ctx.createImageData(128,128);
  for (let i=0;i<pixels.data.length;i+=4) { const n = 126 + Math.sin(Math.floor(i/4/128)*1.41)*3; pixels.data[i]=128; pixels.data[i+1]=n; pixels.data[i+2]=255; pixels.data[i+3]=255; }
  ctx.putImageData(pixels,0,0);
  const brushed = new T.CanvasTexture(normalCanvas); brushed.wrapS = brushed.wrapT = T.RepeatWrapping; brushed.repeat.set(2,8);
  const silver = new T.MeshPhysicalMaterial({ color: 0xd9e4f3, metalness: .9, roughness: .23, clearcoat: .65, clearcoatRoughness: .15, normalMap: brushed, normalScale: new T.Vector2(.06,.06), envMapIntensity: 1.4 });
  const ceramic = new T.MeshPhysicalMaterial({ color: 0xf7faff, metalness: .15, roughness: .25, clearcoat: 1, envMapIntensity: 1.3 });
  const blue = new T.MeshPhysicalMaterial({ color: 0x1764ff, metalness: .35, roughness: .22, clearcoat: 1, emissive: 0x0033b3, emissiveIntensity: .25 });
  const glass = new T.MeshPhysicalMaterial({ color: 0xc9e1ff, metalness: .08, roughness: .08, transparent: true, opacity: .22, clearcoat: 1, depthWrite: false, side: T.DoubleSide, envMapIntensity: 2.1 });
  const graphite = new T.MeshStandardMaterial({ color: 0x182335, metalness: .62, roughness: .27 });
  const globalMaterials = new Set<T.Material>([silver,ceramic,blue,glass,graphite]);
  const loader = new T.TextureLoader();
  const textureState = new WeakMap<T.Texture,'loading'|'ready'|'failed'>();
  let frame = 0, last = 0, clock = 0, disposed = false, lost = false, previousScroll = scrollY, velocity = 0, lastRendered = 0, slowFrames = 0, settleUntil = 0;
  const elements = new Map<HTMLElement, View | null>();
  const frameBounds=new Map<Element,DOMRect>();
  let roomSections:HTMLElement[]=[],roomSample=roomRoute([],0);
  const measure=(el:Element)=>{let rect=frameBounds.get(el);if(!rect){rect=el.getBoundingClientRect();frameBounds.set(el,rect);}return rect;};
  const vector = new T.Vector3();
  const root = document.documentElement;
  const request = () => { settleUntil = performance.now() + 950; if (!frame && !disposed && !document.hidden && !lost) frame = requestAnimationFrame(tick); };
  const map = (url: string, crop?: [number,number,number,number], aspect?: number) => {
    const texture = loader.load(url, () => {
      if (disposed) { texture.dispose(); return; }
      if (aspect && !crop) {
        const image = texture.image as HTMLImageElement;
        const source = image.width / image.height;
        if (source > aspect) { texture.repeat.x = aspect / source; texture.offset.x = (1 - texture.repeat.x) / 2; }
        else { texture.repeat.y = source / aspect; texture.offset.y = (1 - texture.repeat.y) / 2; }
      }
      textureState.set(texture,'ready');request();
    }, undefined, () => { textureState.set(texture,'failed');request(); });
    textureState.set(texture,'loading');
    texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    if (crop) { texture.repeat.set(crop[0],crop[1]); texture.offset.set(crop[2],crop[3]); }
    return texture;
  };
  const box = (w: number,h: number,d: number,material: T.Material,r=.045) => {
    const mesh = new T.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,d*.48,w*.2,h*.2)),material); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
  };
  const line = (points: T.Vector3[], color=0x9bbce7, opacity=.6) => new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({ color, transparent: true, opacity }));
  function picture(texture: T.Texture, w: number,h: number, title = '', dark = false) {
    const group = new T.Group();
    group.add(box(w+.14,h+.38,.12,silver));
    const backing = box(w+.04,h+.28,.14,dark ? graphite : ceramic); backing.position.z=.04; group.add(backing);
    const screen = new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({ map: texture, toneMapped: false })); screen.position.set(0,-.06,.119); group.add(screen);
    for(const [i,color] of [0xe99299,0xe3c678,0x76bba8].entries()) { const dot=new T.Mesh(new T.CircleGeometry(.027,12),new T.MeshBasicMaterial({color})); dot.position.set(-w/2+.12+i*.09,h/2+.064,.12); group.add(dot); }
    if (title) {
      const c=document.createElement('canvas');c.width=512;c.height=32;const g=c.getContext('2d')!;g.font='15px monospace';g.textAlign='center';g.fillStyle=dark?'#e3edff':'#547195';g.fillText(title,256,21);
      const label=new T.Mesh(new T.PlaneGeometry(w*.65,.11),new T.MeshBasicMaterial({ map:new T.CanvasTexture(c),transparent:true,toneMapped:false }));label.position.set(.1,h/2+.065,.123);group.add(label);
    }
    const edge = box(w,.013,.025,blue,.003); edge.position.set(0,-h/2-.13,.114);group.add(edge);
    return group;
  }
  const orbitPath = (radius: number, ratio=1, color=0xa7bfdb, opacity=.6) => line(Array.from({length:129},(_,i)=>{const a=i/128*Math.PI*2;return new T.Vector3(Math.cos(a)*radius,Math.sin(a)*radius*ratio,0);}),color,opacity);
  class EllipticRail extends T.Curve<T.Vector3> {
    constructor(private radius: number, private ratio: number) { super(); }
    getPoint(t: number, target = new T.Vector3()) { const a=t*Math.PI*2;return target.set(Math.cos(a)*this.radius,Math.sin(a)*this.radius*this.ratio,0); }
  }
  const solidRail = (radius: number, ratio: number, material: T.Material, thickness=.018) => new T.Mesh(new T.TubeGeometry(new EllipticRail(radius,ratio),mobile?64:96,thickness,6,true),material);
  function platform(parent: T.Group, radius: number, y: number) {
    const base=new T.Mesh(new T.CylinderGeometry(radius,radius,.1,64),ceramic);base.position.y=y;base.receiveShadow=true;parent.add(base);
    for(const [i,r] of [radius+.15,radius+.45].entries()) { const edge=new T.Mesh(new T.TorusGeometry(r,.011,6,96),i? silver:blue);edge.rotation.x=Math.PI/2;edge.position.y=y+.05;parent.add(edge); }
  }
  function lighting(scene: T.Scene, shadow=false) {
    scene.environment=environment.texture;
    scene.add(new T.AmbientLight(0xecf4ff,1.5));
    const key=new T.DirectionalLight(0xffffff,4.1);key.position.set(-3,7,6);key.castShadow=shadow;
    if(shadow) {key.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.camera.near=.1;key.shadow.camera.far=20;key.shadow.bias=-.001;key.shadow.normalBias=.02;}
    scene.add(key);const fill=new T.DirectionalLight(0xa5c7ff,2.1);fill.position.set(5,1,-3);scene.add(fill);
    const rim=new T.DirectionalLight(0xc4ddff,2.5);rim.position.set(-4,-1,-4);scene.add(rim);
  }
  function fit(view: View, width: number, height: number, dt: number) {
    const distance=fitDistance(width,height,view.camera.aspect,view.camera.fov);
    view.camera.position.z=settleFitDistance(view.camera.position.z,distance,dt);
  }
  function create(el: HTMLElement): View {
    const scene=new T.Scene();const camera=new T.PerspectiveCamera(JOURNEY_STAGE.fov,1,.1,80);camera.position.set(0,.2,10);camera.lookAt(0,0,0);
    const group=new T.Group();scene.add(group);
    const view:View={el,kind:el.dataset.spatial!,scene,camera,group,pointer:new T.Vector2(),smooth:new T.Vector2(),angle:0,inertia:0,assets:[],update:()=>{},handlers:[]};
    lighting(scene,['hero','journey','project','anime'].includes(view.kind));
    let down:{ x:number;y:number;angle:number;lastX:number;lastTime:number;pointer:number;moved:boolean }|null=null;
    let suppressClick=false,mouseHover=false;
    const pointer=(e:PointerEvent)=>{
      mouseHover=e.pointerType==='mouse';
      const r=el.getBoundingClientRect();view.pointer.set(clamp((e.clientX-r.left)/Math.max(1,r.width)-.5,-.5,.5),clamp((e.clientY-r.top)/Math.max(1,r.height)-.5,-.5,.5));
      if(down && e.pointerId===down.pointer && view.kind==='orbit') {
        const dx=e.clientX-down.x,dy=e.clientY-down.y;
        if(!down.moved&&horizontalIntent(dx,dy)){down.moved=true;suppressClick=true;el.setPointerCapture(e.pointerId);}
        if(down.moved){e.preventDefault();view.angle=down.angle+dx*.008;view.inertia=clamp((e.clientX-down.lastX)*.008/Math.max(.008,(e.timeStamp-down.lastTime)/1000),-3,3);down.lastX=e.clientX;down.lastTime=e.timeStamp;}
      }
      request();
    };
    const leave=()=>{mouseHover=false;view.pointer.set(0,0);request();};
    const start=(e:PointerEvent)=>{mouseHover=e.pointerType==='mouse';if(view.kind!=='orbit'||e.button!==0||!e.isPrimary)return;suppressClick=false;down={x:e.clientX,y:e.clientY,angle:view.angle,lastX:e.clientX,lastTime:e.timeStamp,pointer:e.pointerId,moved:false};view.inertia=0;};
    const end=(e:PointerEvent)=>{if(down&&down.pointer!==e.pointerId)return;if(e.type==='pointercancel')view.inertia=0;down=null;if(e.pointerType!=='mouse')view.pointer.set(0,0);request();};
    const click=(e:MouseEvent)=>{if(suppressClick){e.preventDefault();e.stopPropagation();suppressClick=false;}};
    const surface = view.kind === 'project' ? el.closest<HTMLElement>('.work-card') || el : el;
    surface.addEventListener('pointermove',pointer);surface.addEventListener('pointerleave',leave);surface.addEventListener('pointerdown',start);surface.addEventListener('pointerup',end);surface.addEventListener('pointercancel',end);
    surface.addEventListener('click',click,true);
    view.handlers.push(()=>{surface.removeEventListener('pointermove',pointer);surface.removeEventListener('pointerleave',leave);surface.removeEventListener('pointerdown',start);surface.removeEventListener('pointerup',end);surface.removeEventListener('pointercancel',end);surface.removeEventListener('click',click,true);});
    if(view.kind==='room') {
      scene.fog=new T.Fog(0xf5f8fd,12,34);
      const floorMaterial=makeRoomFloor();
      const floor=new T.Mesh(new T.PlaneGeometry(55,55),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-3.4;floor.position.z=-4;group.add(floor);
      const glazed:T.Mesh[]=[];
      for(let i=0;i<7;i++) {
        const frame=new T.Group();const w=7.8,h=6;
        for(const y of [-h/2,h/2]) {const bar=box(w,.04,.07,silver,.012);bar.position.y=y;frame.add(bar);}
        for(const x of [-w/2,w/2]) {const bar=box(.045,h,.07,silver,.012);bar.position.x=x;frame.add(bar);}
        frame.position.set(3.7+i*.45,.12,-i*2.5-2);group.add(frame);
        if(i%2===0) {const panel=box(w-.07,h-.07,.065,glass,.012);panel.position.copy(frame.position);glazed.push(panel);group.add(panel);}
        if(i%3===0){const light=box(.022,h-.3,.03,blue,.006);light.position.set(frame.position.x-w/2+.13,frame.position.y,frame.position.z+.05);group.add(light);}
      }
      const wall=box(.05,12,30,glass,.01);wall.position.set(7,2,-7);group.add(wall);
      for(let i=0;i<8;i++) group.add(line([new T.Vector3(1.5+i*.65,-3.32,6),new T.Vector3(1.5+i*.65,-3.32,-20)],i%3?0xb6cae6:0x2166ff,i%3?.3:.65));
      view.update=(time,dt,motion)=>{const {pose,travel}=roomSample;camera.position.x=T.MathUtils.damp(camera.position.x,pose[0]+(motion?view.smooth.x*.4:0),4,dt);camera.position.y=T.MathUtils.damp(camera.position.y,pose[1],4,dt);camera.position.z=T.MathUtils.damp(camera.position.z,pose[2],4,dt);camera.lookAt(.2,0,-3);group.rotation.y=T.MathUtils.damp(group.rotation.y,pose[3],4,dt);floorMaterial.uniforms.uTime.value=motion?time:0;floorMaterial.uniforms.uTravel.value=travel*.18;floorMaterial.uniforms.uMotion.value=motion?1:0;floorMaterial.uniforms.uSpeed.value=Math.abs(velocity);glazed.forEach((panel,i)=>{panel.rotation.y=(motion?Math.sin(time*.18+i)*.012:0)+Math.sin(travel*.8+i)*.018;});};
    } else if(view.kind==='hero') {
      const cards=[picture(map('/images/pp.webp',[.4,.45,.6,.425]),HERO_STAGE.frames[0][0],HERO_STAGE.frames[0][1],'R_HMT.JPG'),picture(map('/images/pp.webp',[.6,.54,0,.35]),HERO_STAGE.frames[1][0],HERO_STAGE.frames[1][1],'LEARNING BY BUILDING',true),picture(map('/images/anime-v22/elaina.webp',undefined,2.55/3.25),HERO_STAGE.frames[2][0],HERO_STAGE.frames[2][1],'THE PERSONAL UNIVERSE'),picture(map('/components/works/repo-flow.svg'),HERO_STAGE.frames[3][0],HERO_STAGE.frames[3][1],'THE WORKS / 16 ENTRIES')];
      cards.forEach(c=>group.add(c));
      platform(group,HERO_STAGE.platform[0],HERO_STAGE.platform[2]);
      const path=orbitPath(2.8,.75,0x2166ff,.32);path.rotation.x=1.36;path.position.y=-2.12;group.add(path);
      let open=0,entrance=0;const launch=()=>{entrance=0;request();};window.addEventListener('rhmt:intro-complete',launch);view.handlers.push(()=>window.removeEventListener('rhmt:intro-complete',launch));
      view.update=(time,dt,motion,r)=>{
        open=T.MathUtils.damp(open,el.dataset.expanded==='true'?1:0,5,dt);entrance=motion?Math.min(1,entrance+dt*.85):1;
        const scroll=clamp(-r.top/Math.max(1,r.height),0,1);
        cards.forEach((card,i)=>{const pose=heroFramePose(i,open,entrance,time,motion,velocity);card.position.set(pose.position[0],pose.position[1],pose.position[2]);card.rotation.set(pose.rotation[0],pose.rotation[1],pose.rotation[2]);});
        const pose=heroGroupPose(entrance,scroll,view.smooth.x,view.smooth.y,motion);group.rotation.set(pose.rotation[0],pose.rotation[1],pose.rotation[2]);group.position.y=pose.y;
        camera.position.x=motion?view.smooth.x*.08:0;fit(view,T.MathUtils.lerp(HERO_STAGE.width,HERO_STAGE.expandedWidth,open),HERO_STAGE.height,dt);camera.lookAt(0,.02,0);
      };
    } else if(view.kind==='intro') {
      const identity=new T.Group();
      const bezel=new T.Mesh(new T.CylinderGeometry(1.26,1.26,.2,64),silver);bezel.rotation.x=Math.PI/2;identity.add(bezel);
      const avatar=new T.Mesh(new T.CircleGeometry(1.17,64),new T.MeshBasicMaterial({map:map('/images/pp-dev.webp'),toneMapped:false}));avatar.position.z=.108;identity.add(avatar);
      const rim=new T.Mesh(new T.TorusGeometry(1.23,.04,8,96),ceramic);rim.position.z=.12;identity.add(rim);
      const signal=new T.Mesh(new T.TorusGeometry(1.34,.027,8,96,Math.PI*1.5),blue);signal.position.z=.04;identity.add(signal);
      group.add(identity);
      const fragments:T.Mesh[]=[];
      for(let i=0;i<12;i++){const part=box(i%3===0?.9:.055,i%3===0?.055:.85,.065,i%4===0?blue:silver,.012);fragments.push(part);group.add(part);}
      const halo=new T.Mesh(new T.TorusGeometry(1.52,.018,8,96),silver);group.add(halo);
      let birth=0,exit=0;
      view.update=(time,dt,motion)=>{
        birth+=dt;const p=ease((birth-.22)/1.25);const leaving=el.dataset.leaving==='true';if(leaving)exit=Math.min(1,exit+dt/.65);
        fragments.forEach((part,i)=>{const local=ease((birth-i*.035)/1.12);const a=i/12*Math.PI*2;const radius=1.62+(1-local)*2.5;part.position.set(Math.cos(a)*radius,Math.sin(a)*radius,(1-local)*Math.sin(i)*1.7);part.rotation.set((1-local)*i*.3,(1-local)*i*.2,a+(i%3===0?0:Math.PI/2));});
        identity.rotation.y=(1-p)*1.2;identity.scale.setScalar(.8+p*.2);signal.rotation.z=motion?time*.42:0;group.rotation.y=(motion?Math.sin(time*.5)*.045:0)+ease(exit)*.75;group.position.z=-ease(exit)*3.5;group.scale.setScalar(1-ease(exit)*.91);
        halo.rotation.z=motion?time*.12:0;camera.position.x=T.MathUtils.damp(camera.position.x,(1-p)*.2,5,dt);fit(view,4.5,4.5,dt);camera.lookAt(0,0,0);
      };
    } else if(view.kind==='journey') {
      const phaseOnMount=clamp(Math.round(Number(el.dataset.phase)||0),0,5);
      const phone=new T.Group();phone.add(box(JOURNEY_SHAPES.phone[0]-.03,JOURNEY_SHAPES.phone[1]-.01,.2,graphite,.085));const rim=box(JOURNEY_SHAPES.phone[0],JOURNEY_SHAPES.phone[1],.12,silver,.055);rim.position.z=-.09;phone.add(rim);
      const textures=content.JOURNEY_STEPS.map((step,i)=>{const c=document.createElement('canvas');c.width=480;c.height=920;const g=c.getContext('2d')!;g.fillStyle='#f1f6ff';g.fillRect(0,0,480,920);g.fillStyle='#2166ff';g.font='24px monospace';g.fillText(`chapter / 0${i+1}`,38,100);g.font='bold 70px monospace';g.fillText('0'+(i+1),34,226);g.font='23px monospace';g.fillStyle='#283c59';['<learning />','human × AI','request → response','build → deploy',...step.techKeywords.slice(0,4)].slice(i%3,i%3+5).forEach((s,n)=>g.fillText(s,38,338+n*73));g.strokeStyle='#bfd5f3';g.lineWidth=2;for(let n=0;n<8;n++){g.beginPath();g.moveTo(38,755+n*12);g.lineTo(295+(n%3)*41,755+n*12);g.stroke();}const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;});
      const screenMat=new T.MeshBasicMaterial({map:textures[phaseOnMount],toneMapped:false});const screen=new T.Mesh(new T.PlaneGeometry(1.6,3.1),screenMat);screen.position.z=.113;phone.add(screen);
      const speaker=box(.38,.037,.015,graphite,.005);speaker.position.set(0,1.69,.119);phone.add(speaker);const home=new T.Mesh(new T.CircleGeometry(.06,20),silver);home.position.set(0,-1.67,.122);phone.add(home);
      group.add(phone);
      const laptop=new T.Group();const base=box(JOURNEY_SHAPES.base[0],JOURNEY_SHAPES.base[1],JOURNEY_SHAPES.base[2],silver,.035);base.position.set(0,-.91,.3);laptop.add(base);
      const keyboardCanvas=document.createElement('canvas');keyboardCanvas.width=768;keyboardCanvas.height=340;const keys=keyboardCanvas.getContext('2d')!;keys.fillStyle='#d9e5f3';keys.fillRect(0,0,768,340);
      for(let row=0;row<5;row++)for(let col=0;col<14;col++){keys.fillStyle=row===0?'#8da8ca':'#253958';keys.beginPath();keys.roundRect(13+col*53,14+row*62,45,48,5);keys.fill();}
      const keyboardTexture=new T.CanvasTexture(keyboardCanvas);keyboardTexture.colorSpace=T.SRGBColorSpace;
      const keyboard=new T.Mesh(new T.PlaneGeometry(2.72,.99),new T.MeshBasicMaterial({map:keyboardTexture,toneMapped:false}));keyboard.rotation.x=-Math.PI/2;keyboard.position.set(0,-.842,.13);laptop.add(keyboard);
      const trackpad=box(.85,.009,.38,ceramic,.003);trackpad.position.set(0,-.842,1.02);laptop.add(trackpad);
      const hinge=new T.Group();hinge.position.set(0,-.85,-.58);laptop.add(hinge);
      const laptopTextures=content.JOURNEY_STEPS.map((step,i)=>{const c=document.createElement('canvas');c.width=840;c.height=520;const g=c.getContext('2d')!;g.fillStyle='#f3f7ff';g.fillRect(0,0,840,520);g.fillStyle='#dbe8fc';g.fillRect(0,0,840,45);g.fillStyle='#2166ff';g.font='18px monospace';g.fillText(`R_HMT / chapter 0${i+1}`,32,30);g.fillStyle='#142e52';g.font='bold 34px monospace';g.fillText(['the origin','learn by building','human × AI','request → response','idea → iteration','still learning();'][i],38,118);step.techKeywords.forEach((term,n)=>{g.fillStyle='#7c95b8';g.font='18px monospace';g.fillText(String(n+1).padStart(2,'0'),38,187+n*64);g.fillStyle=n%2?'#284367':'#2166ff';g.font='24px monospace';g.fillText(term,84,187+n*64);});const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;});
      const lid=box(JOURNEY_SHAPES.lid[0],JOURNEY_SHAPES.lid[1],.115,silver,.035);lid.position.y=.95;hinge.add(lid);
      const laptopScreenMaterial=new T.MeshBasicMaterial({map:laptopTextures[phaseOnMount],toneMapped:false});const laptopScreen=new T.Mesh(new T.PlaneGeometry(2.82,1.67),laptopScreenMaterial);laptopScreen.position.set(0,.95,.062);hinge.add(laptopScreen);
      const laptopBack=box(.13,.13,.012,blue,.004);laptopBack.position.set(0,.95,-.064);hinge.add(laptopBack);group.add(laptop);
      const modules=new T.Group();const cubeMaterials:T.MeshPhysicalMaterial[]=[];const cubes=Array.from({length:6},(_,i)=>{const material=(i%3===0?blue:i%2?silver:glass).clone();material.emissive.setHex(0x2166ff);cubeMaterials.push(material);const cube=box(JOURNEY_SHAPES.module[0],JOURNEY_SHAPES.module[1],.46,material,.05);modules.add(cube);const chip=box(.23,.23,.015,i%3===0?ceramic:blue,.004);chip.position.z=.237;cube.add(chip);return cube;});
      const wirePositions=new Float32Array(6*2*3);const wireGeometry=new T.BufferGeometry();wireGeometry.setAttribute('position',new T.BufferAttribute(wirePositions,3));const wires=new T.LineSegments(wireGeometry,new T.LineBasicMaterial({color:0x548eee,transparent:true,opacity:.48}));wires.frustumCulled=false;modules.add(wires);group.add(modules);
      const signalMaterial=blue.clone();signalMaterial.emissiveIntensity=.9;const signal=new T.Mesh(new T.SphereGeometry(.045,12,8),signalMaterial);signal.visible=false;modules.add(signal);
      platform(group,JOURNEY_SHAPES.platform[0],JOURNEY_SHAPES.platform[2]);const circuit=solidRail(2.57,.64,silver,.013);circuit.rotation.x=1.32;circuit.position.y=-1.98;group.add(circuit);
      const follow=(object:T.Object3D,pose:number[],dt:number)=>{object.position.x=T.MathUtils.damp(object.position.x,pose[0],5,dt);object.position.y=T.MathUtils.damp(object.position.y,pose[1],5,dt);object.position.z=T.MathUtils.damp(object.position.z,pose[2],5,dt);object.scale.setScalar(T.MathUtils.damp(object.scale.x,pose[3],5,dt));};
      const initial=journeyLayout(phaseOnMount);for(const [object,pose] of [[phone,initial.phone],[laptop,initial.laptop],[modules,initial.modules]] as [T.Object3D,number[]][]){object.position.set(pose[0],pose[1],pose[2]);object.scale.setScalar(pose[3]);}hinge.rotation.x=initial.hinge;
      let phase=phaseOnMount;const turn=createJourneyTurn(phaseOnMount);
      view.update=(time,dt,motion,r)=>{
        advanceJourneyTurn(turn,el.dataset.phase,dt,motion);
        if(phase!==turn.screen){phase=turn.screen;screenMat.map=textures[phase];screenMat.needsUpdate=true;laptopScreenMaterial.map=laptopTextures[phase];laptopScreenMaterial.needsUpdate=true;}
        const progress=clamp((innerHeight*.55-r.top)/(innerHeight+r.height),0,1);
        const pose=journeyLayout(turn.target);follow(phone,pose.phone,dt);follow(laptop,pose.laptop,dt);follow(modules,pose.modules,dt);hinge.rotation.x=T.MathUtils.damp(hinge.rotation.x,pose.hinge,4,dt);
        phone.rotation.y=-.32+(motion?view.smooth.x*.3+turn.angle:0);phone.rotation.z=.055+(progress-.5)*.04;phone.position.y+=motion?Math.sin(time*.65)*.002:0;
        laptop.rotation.y=T.MathUtils.damp(laptop.rotation.y,-.26+(motion?view.smooth.x*.18:0)+(progress-.5)*.09,5,dt);laptop.rotation.z=-.035;
        modules.rotation.y=T.MathUtils.damp(modules.rotation.y,-.2+(motion?Math.sin(time*.23)*.08:0),4,dt);
        cubes.forEach((cube,i)=>{const p=pose.cubes[i];cube.position.x=T.MathUtils.damp(cube.position.x,p[0],5,dt);cube.position.y=T.MathUtils.damp(cube.position.y,p[1],5,dt);cube.position.z=T.MathUtils.damp(cube.position.z,p[2],5,dt);cube.rotation.y=motion?Math.sin(time*.4+i)*.09:0;cubeMaterials[i].emissiveIntensity=(i%3===0?.25:0)+journeySignal(turn.elapsed,i,motion)*.48;});cubes.forEach((cube,i)=>{cube.position.toArray(wirePositions,i*6);cubes[(i+1)%cubes.length].position.toArray(wirePositions,i*6+3);});(wireGeometry.attributes.position as T.BufferAttribute).needsUpdate=true;
        signal.visible=motion&&turn.elapsed>=.12&&turn.elapsed<.99;if(signal.visible){const travel=(turn.elapsed-.12)/.87*cubes.length,index=Math.floor(travel);signal.position.copy(cubes[index].position).lerp(cubes[(index+1)%cubes.length].position,travel-index);}
        const eye=journeyCamera(progress,view.smooth.x,motion);group.rotation.y=.03+progress*.11;fit(view,JOURNEY_STAGE.width,JOURNEY_STAGE.height,dt);camera.position.x=eye.x;camera.position.y=eye.y;camera.lookAt(0,0,0);
      };
      view.handlers.push(()=>[...textures,...laptopTextures].forEach(t=>t.dispose()));
    } else if(view.kind==='orbit') {
      const core=new T.Group();const base=new T.Mesh(new T.CylinderGeometry(.8,.8,.15,48),silver);base.rotation.x=Math.PI/2;core.add(base);const face=new T.Mesh(new T.CircleGeometry(.72,64),new T.MeshBasicMaterial({map:map('/images/pp-dev.webp'),toneMapped:false}));face.position.z=.091;core.add(face);group.add(core);
      const coreRim=new T.Mesh(new T.TorusGeometry(.79,.032,8,64),blue);coreRim.position.z=.092;core.add(coreRim);
      const plaqueCanvas=document.createElement('canvas');plaqueCanvas.width=320;plaqueCanvas.height=90;const caption=plaqueCanvas.getContext('2d')!;caption.fillStyle='#2166ff';caption.textAlign='center';caption.font='bold 34px monospace';caption.fillText('19 / TOOLS',160,50);caption.font='14px monospace';caption.fillStyle='#57769f';caption.fillText('a personal ecosystem',160,75);
      const plaque=new T.Mesh(new T.PlaneGeometry(1.65,.46),new T.MeshBasicMaterial({map:new T.CanvasTexture(plaqueCanvas),transparent:true,toneMapped:false}));plaque.position.set(0,-1.12,.18);core.add(plaque);
      const neutralRail=new T.Color(0xb1c6e1),activeRail=new T.Color(0x316fff);const railMaterials:T.MeshPhysicalMaterial[]=[];const runners:T.Mesh[]=[];
      const planes:T.Group[]=[];for(let i=0;i<4;i++){const p=new T.Group();p.rotation.set([.95,-.8,.7,-.55][i],[.2,-.32,.45,-.1][i],[-.23,.41,-.5,.18][i]);const material=silver.clone();material.roughness=.19;railMaterials.push(material);p.add(solidRail(2.6+i*.31,.7,material,.022));const runner=new T.Mesh(new T.SphereGeometry(.075,12,8),i%2?blue:silver);p.add(runner);runners.push(runner);planes.push(p);group.add(p);}
      const nodes=tools.map((tool,i)=>{const tile=new T.Group();tile.add(box(.68,.68,.18,ceramic));const edge=box(.71,.71,.16,silver,.035);edge.position.z=-.055;tile.add(edge);const lip=box(.7,.018,.025,blue,.005);lip.position.set(0,-.335,.108);tile.add(lip);const logo=new T.Mesh(new T.PlaneGeometry(.47,.47),new T.MeshBasicMaterial({map:map(`/images/tools/${tool.name.toLowerCase().replace(/ /g,'-')}.svg`),transparent:true,toneMapped:false}));logo.position.z=.102;tile.add(logo);group.add(tile);return {tool,tile,hit:el.querySelector<HTMLElement>(`[data-node="${i}"]`)!};});
      const position=new T.Vector3();let reset=el.dataset.reset,selection='';let focus=0;
      view.update=(time,dt,motion,r)=>{
        camera.position.y=.4;fit(view,8.45,6.6,dt);camera.lookAt(0,0,0);camera.updateMatrixWorld();
        if(reset!==el.dataset.reset){reset=el.dataset.reset;view.angle=0;view.inertia=0;}
        const selected=el.dataset.selected||'';if(selected!==selection){selection=selected;focus=0;}focus=Math.min(1,focus+dt*1.8);
        const held=Boolean(el.querySelector('button:focus-visible'))||(mouseHover&&Boolean(el.querySelector('button:hover')));
        if(motion&&!down&&!held&&!selection) view.angle+=dt*.13;
        if(!down&&motion&&!held&&!selection){const spin=decaySpin(view.inertia,dt);view.angle+=spin.travel;view.inertia=spin.velocity;}else if(!motion||held||selection)view.inertia=0;
        const progress=clamp((innerHeight*.65-r.top)/r.height,0,1);
        group.rotation.y=(motion?view.smooth.x*.15:0)+progress*.06;group.rotation.x=motion?view.smooth.y*.08:0;
        core.rotation.y=motion?Math.sin(time*.4)*.12:0;
        const category=clamp(Number(el.dataset.group)||0,0,3);
        railMaterials.forEach((material,i)=>material.color.lerp(i===category?activeRail:neutralRail,1-Math.exp(-dt*5)));
        runners.forEach((runner,i)=>{const a=(motion?time*.26:0)+i*1.35+view.angle;const radius=2.6+i*.31;runner.position.set(Math.cos(a)*radius,Math.sin(a)*radius*.7,0);});
        nodes.forEach(({tool,tile,hit},i)=>{
          const a=tool.order/tool.count*Math.PI*2+tool.group*.9+view.angle*(tool.group%2?-.72:1);const radius=2.6+tool.group*.31;
          position.set(Math.cos(a)*radius,Math.sin(a)*radius*.7,0).applyEuler(planes[tool.group].rotation);
          if(tool.name===selection)position.lerp(new T.Vector3(0,-.15,3.15),ease(focus));
          tile.position.lerp(position,1-Math.exp(-dt*9));tile.quaternion.copy(camera.quaternion);tile.rotateY(Math.sin(i+(motion?time*.2:0))*.18);tile.rotateX(Math.cos(i*.8+(motion?time*.16:0))*.1);
          const scale=tool.name===selection?1+.45*ease(focus):tool.group===category?1.07:.97;tile.scale.setScalar(T.MathUtils.damp(tile.scale.x,scale,6,dt));
          tile.getWorldPosition(vector);const projection=projectHit(vector,camera,r.width,r.height,.7*tile.scale.x);
          hit.style.left=`${projection.x}px`;hit.style.top=`${projection.y}px`;
          hit.style.width=`${projection.size}px`;hit.style.height=`${projection.size}px`;hit.style.zIndex=String(1000-Math.round(projection.depth*10));hit.style.visibility=projection.visible?'visible':'hidden';
        });
      };
      view.handlers.push(()=>nodes.forEach(n=>n.hit.removeAttribute('style')));
    } else if(view.kind==='project'||view.kind==='anime') {
      const anime=view.kind==='anime';const image=el.dataset.image||`/components/works/${el.dataset.project}.svg`;
      const photo=picture(map(image,undefined,anime?ANIME_STAGE.screen[0]/ANIME_STAGE.screen[1]:WORK_STAGE.screen[0]/WORK_STAGE.screen[1]),anime?ANIME_STAGE.screen[0]:WORK_STAGE.screen[0],anime?ANIME_STAGE.screen[1]:WORK_STAGE.screen[1],anime?'PERSONAL COLLECTION':'R_HMT / DIGITAL ARCHIVE');group.add(photo);
      if(!anime) {const floor=box(6.2,.07,2.4,glass,.02);floor.position.set(0,-1.88,-.5);group.add(floor);const rail=box(6.4,.018,.025,blue,.006);rail.position.set(0,-1.83,.71);group.add(rail);for(const x of [-1.75,1.75]){const foot=box(.17,.16,.56,silver,.035);foot.position.set(x,-1.79,-.15);photo.add(foot);}}
      let entered=0,previousCenter=0,shelfVelocity=0;
      view.update=(time,dt,motion,r)=>{entered=motion?Math.min(1,entered+dt*1.7):1;const shelf=el.closest('.works-shelf,.anime-gallery');const shelfBounds=shelf?measure(shelf):undefined;const center=(r.left+r.width/2-(shelfBounds?shelfBounds.left+shelfBounds.width/2:innerWidth/2))/(shelfBounds?.width||innerWidth);shelfVelocity=T.MathUtils.damp(shelfVelocity,clamp((center-previousCenter)/Math.max(.001,dt),-4,4),7,dt);previousCenter=center;
        const focused=el.closest('.work-card')?.classList.contains('shelf-current');
        const pose=workFramePose(center,shelfVelocity,Boolean(focused),motion);
        photo.rotation.y=T.MathUtils.damp(photo.rotation.y,(anime?-.06:pose.yaw)+(motion?view.smooth.x*.24:0),6,dt);
        photo.rotation.x=T.MathUtils.damp(photo.rotation.x,motion?view.smooth.y*.12+shelfVelocity*.012:0,6,dt);photo.rotation.z=anime?-.015:0;
        photo.position.y=(1-ease(entered))*.22+(anime&&motion?Math.sin(time*.5)*.022:0);
        photo.position.z=T.MathUtils.damp(photo.position.z,anime?0:pose.depth,5,dt);photo.scale.setScalar(T.MathUtils.damp(photo.scale.x,anime?1:pose.scale,5,dt));
        fit(view,anime?ANIME_STAGE.width:WORK_STAGE.width,anime?ANIME_STAGE.height:WORK_STAGE.height,dt);camera.lookAt(0,0,0);
      };
    }
    const assets=new Set<T.Texture>();scene.traverse(object=>{if(!(object instanceof T.Mesh))return;(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>{const texture=(material as T.MeshBasicMaterial).map;if(texture&&textureState.has(texture))assets.add(texture);});});view.assets=[...assets];
    return view;
  }
  function release(view: View) {
    view.handlers.forEach(f=>f());view.el.classList.remove('spatial-ready');
    const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
    view.scene.traverse(o=>{if(o instanceof T.DirectionalLight)o.shadow.dispose();if(o instanceof T.Mesh||o instanceof T.Line){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(globalMaterials.has(m))return;materials.add(m);for(const value of Object.values(m))if(value instanceof T.Texture&&value!==brushed)textures.add(value);});}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  }
  function sync() {
    const current=new Set(Array.from(document.getElementById('root')!.querySelectorAll<HTMLElement>('[data-spatial]')).filter(el=>isSceneKind(el.dataset.spatial)));
    for(const [el,view] of elements)if(!current.has(el)){if(view)release(view);elements.delete(el);}
    current.forEach(el=>{if(!elements.has(el))elements.set(el,null);});roomSections=Array.from(document.querySelectorAll<HTMLElement>('main section[id], main footer[id]')).filter(el=>el.id in ROOM_POSES);request();
  }
  function clipping(el: HTMLElement, rect: Bounds): Bounds {
    let left=Math.max(rect.left,0),top=Math.max(rect.top,0),right=Math.min(rect.right,innerWidth),bottom=Math.min(rect.bottom,innerHeight);
    const shelf=el.closest('.works-shelf,.anime-gallery');
    if(shelf){const b=measure(shelf);left=Math.max(left,b.left);right=Math.min(right,b.right);top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);}
    const headerEl=document.querySelector('.site-header');const header=headerEl?measure(headerEl):undefined;if(header&&el.dataset.spatial!=='intro')top=Math.max(top,header.bottom);
    return {left,top,right,bottom,width:right-left,height:bottom-top};
  }
  function tick(now: number) {
    frame=0;if(disposed||lost||document.hidden)return;
    if(document.querySelector('dialog.modal[open]'))return;
    try {
    const motion=root.dataset.motion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gap=now-(last||now-16);const dt=Math.min(gap/1000,.06);last=now;clock+=dt;
    const scrollDelta=scrollY-previousScroll;previousScroll=scrollY;velocity=T.MathUtils.damp(velocity,clamp(scrollDelta/Math.max(.001,dt)/1600,-2,2),8,dt);
    const rate=mobile?30:60;
    if(now-lastRendered<1000/rate*.9){frame=requestAnimationFrame(tick);return;}
    const renderedDt=Math.min((now-(lastRendered||now-16))/1000,.08);
    lastRendered=now;renderer.info.reset();renderer.setScissorTest(false);renderer.setClearColor(0x000000,0);renderer.clear(true,true,true);renderer.setScissorTest(true);
    const intro=root.dataset.intro==='on';let visible=0,continuous=false,waiting=0,failed=0;const begin=performance.now();
    frameBounds.clear();
    const stages:{el:HTMLElement;existing:View|null;rect:DOMRect;clip:Bounds}[]=[];
    for(const [el,existing] of elements){
      if(intro!==Boolean(el.dataset.spatial==='intro'))continue;
      // The canvas sits below dialog top layers; dialog imagery uses its native fallback.
      if(el.closest('dialog')&&el.dataset.spatial!=='intro')continue;
      const rect=measure(el);if(rect.width<2||rect.height<2||rect.bottom<0||rect.top>innerHeight||rect.right<0||rect.left>innerWidth)continue;
      const clip=clipping(el,rect);if(clip.width<2||clip.height<2)continue;
      stages.push({el,existing,rect,clip});
    }
    if(stages.some(stage=>stage.el.dataset.spatial==='room'))roomSample=roomRoute(roomSections.map(section=>({id:section.id,top:measure(section).top})),innerHeight*.36);
    for(const {el,existing,rect,clip} of stages){
      let view=existing;if(!view){view=create(el);elements.set(el,view);}
      if(view.assets.some(texture=>textureState.get(texture)!=='ready')){if(view.assets.some(texture=>textureState.get(texture)==='failed'))failed++;else waiting++;el.classList.remove('spatial-ready');continue;}
      view.camera.aspect=rect.width/rect.height;view.camera.updateProjectionMatrix();
      view.camera.updateMatrixWorld();
      view.smooth.lerp(view.pointer,1-Math.exp(-renderedDt*5));
      view.update(clock,motion?renderedDt:1,motion&&el.dataset.paused!=='true',rect);
      renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);
      renderer.setScissor(clip.left,innerHeight-clip.bottom,clip.width,clip.height);
      renderer.clearDepth();renderer.render(view.scene,view.camera);el.classList.add('spatial-ready');visible++;
      if(el.dataset.paused!=='true'&&(['hero','journey','orbit','anime'].includes(view.kind)||(view.kind==='room'&&!saveData&&['home','journey','ecosystem','archive','universe'].includes(root.dataset.chapter||'home'))))continuous=true;
    }
    const cost=performance.now()-begin;
    if(cost>35||gap>(mobile?55:40))slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
    if(slowFrames>48&&pixelRatio>.85){pixelRatio=Math.max(.85,pixelRatio-.2);renderer.setPixelRatio(pixelRatio);resize();slowFrames=0;}
    (window as any).__RHMT_SPATIAL__={renderer:'WebGL2',contexts:1,visibleStages:visible,pixelRatio,renderMs:Math.round(cost*10)/10,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
    root.dataset.spatial=visible?'ready':waiting?'loading':failed?'unavailable':'ready';
    if(!frame&&((motion&&(continuous||now<settleUntil))||intro||Math.abs(velocity)>.002))frame=requestAnimationFrame(tick);
    } catch (error) {
      lost=true;cancelAnimationFrame(frame);frame=0;root.dataset.spatial='unavailable';
      showFallbacks();
      try { renderer.setScissorTest(false);renderer.clear(true,true,true); } catch {}
      (window as any).__RHMT_SPATIAL__={renderer:'unavailable',reason:'Scene rendering failed'};
      console.error('R_HMT spatial renderer stopped; native content remains available.',error);
    }
  }
  function resize(){mobile=matchMedia('(max-width: 760px)').matches;const cap=mobile||saveData?1.25:1.7;if(pixelRatio>cap){pixelRatio=cap;renderer.setPixelRatio(pixelRatio);}renderer.setSize(innerWidth,innerHeight,false);canvas.style.width='100%';canvas.style.height='100%';request();}
  const mutation=new MutationObserver(entries=>{if(entries.some(e=>e.type==='childList'))sync();else if(entries.some(e=>e.attributeName!=='class'||(e.target as HTMLElement).classList.contains('work-card')))request();});
  mutation.observe(document.getElementById('root')!,{subtree:true,childList:true,attributes:true,attributeFilter:['class','open','hidden','data-expanded','data-phase','data-selected','data-group','data-reset','data-paused','data-leaving']});
  const layoutObserver=new ResizeObserver(request);const main=document.querySelector('main');if(main)layoutObserver.observe(main);
  const header=document.querySelector('.site-header');if(header)layoutObserver.observe(header);
  const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else request();};
  function showFallbacks(){elements.forEach((v,el)=>{el.classList.remove('spatial-ready');el.querySelectorAll<HTMLElement>('[data-node]').forEach(n=>n.removeAttribute('style'));});}
  const onLost=(e:Event)=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;root.dataset.spatial='unavailable';showFallbacks();};
  const onRestored=()=>{try{const previous=environment;environment=makeEnvironment();elements.forEach(v=>{if(v)v.scene.environment=environment.texture;});previous.dispose();lost=false;request();}catch{root.dataset.spatial='unavailable';}};
  const roomPointer=(e:PointerEvent)=>{for(const view of elements.values())if(view?.kind==='room')view.pointer.set(e.clientX/innerWidth-.5,e.clientY/innerHeight-.5);request();};
  const roomLeave=()=>{for(const view of elements.values())if(view?.kind==='room')view.pointer.set(0,0);request();};
  const roomRelease=(e:PointerEvent)=>{if(e.pointerType!=='mouse')roomLeave();};
  canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
  window.addEventListener('pointermove',roomPointer,{passive:true});document.documentElement.addEventListener('pointerleave',roomLeave);
  window.addEventListener('pointerup',roomRelease);window.addEventListener('pointercancel',roomRelease);
  window.addEventListener('resize',resize);document.addEventListener('scroll',request,{passive:true,capture:true});window.addEventListener('rhmt:intro-complete',request);document.addEventListener('visibilitychange',onVisibility);document.fonts.ready.then(request);
  const motionObserver=new MutationObserver(request);motionObserver.observe(root,{attributes:true,attributeFilter:['data-motion','data-intro','data-chapter']});
  resize();sync();
  return ()=>{disposed=true;cancelAnimationFrame(frame);mutation.disconnect();motionObserver.disconnect();layoutObserver.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('scroll',request,true);window.removeEventListener('rhmt:intro-complete',request);document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pointermove',roomPointer);document.documentElement.removeEventListener('pointerleave',roomLeave);window.removeEventListener('pointerup',roomRelease);window.removeEventListener('pointercancel',roomRelease);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);elements.forEach(v=>{if(v)release(v);});globalMaterials.forEach(m=>m.dispose());brushed.dispose();environment.dispose();renderer.dispose();canvas.remove();root.removeAttribute('data-spatial');};
}
