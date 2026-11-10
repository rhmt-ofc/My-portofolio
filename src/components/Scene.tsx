import { useRef, useState, type PointerEvent } from 'react';
import { ArrowUpRight, Braces, Layers3 } from 'lucide-react';
import { PROJECTS } from '../data';
const photos=[
  {id:'portrait',src:'/images/pp.webp',alt:'Foto asli R_HMT dengan kacamata dan hoodie hitam',title:'R_HMT',caption:'Student · Developer · Explorer',width:762,height:960},
  {id:'work',src:'/components/works/repo-flow.svg',alt:'Ilustrasi RepoFlow, salah satu karya R_HMT',title:'Selected Works',caption:'Build. Learn. Repeat.',width:820,height:500},
  {id:'personal',src:'/images/anime-v22/elaina.jpg',alt:'Elaina',title:'Elaina',caption:'A little more me.',width:600,height:900}
];
export default function Scene({paused=false}:{mode?:'hero';paused?:boolean}) {
  const ref=useRef<HTMLDivElement>(null),[expanded,setExpanded]=useState(false),[order,setOrder]=useState([0,1,2]);
  const gesture=useRef<{x:number;y:number}|null>(null),suppressClick=useRef(0);
  function cycle(direction:number,focus=false){const next=direction>0?order[1]:order[order.length-1];choose(next);if(focus)ref.current?.querySelector<HTMLButtonElement>(`[data-photo-index="${next}"]`)?.focus({preventScroll:true});}
  function down(e:PointerEvent<HTMLDivElement>){if(e.pointerType==='mouse'||!(e.target as HTMLElement).closest('.portrait-assembly'))return;gesture.current={x:e.clientX,y:e.clientY};}
  function up(e:PointerEvent<HTMLDivElement>){const origin=gesture.current;gesture.current=null;if(!origin)return;const dx=e.clientX-origin.x,dy=e.clientY-origin.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4){cycle(dx<0?1:-1);suppressClick.current=performance.now()+400;}}
  function choose(index:number){setOrder(current=>[index,...current.filter(i=>i!==index)]);}
  function tilt(e:PointerEvent<HTMLDivElement>){if(paused||e.pointerType!=='mouse')return;const r=e.currentTarget.getBoundingClientRect();ref.current?.style.setProperty('--glass-light-x',`${(e.clientX-r.left)/r.width*100}%`);ref.current?.style.setProperty('--glass-light-y',`${(e.clientY-r.top)/r.height*100}%`);ref.current?.style.setProperty('--tilt-x',`${-(e.clientY-r.top-r.height/2)/r.height*8}deg`);ref.current?.style.setProperty('--tilt-y',`${(e.clientX-r.left-r.width/2)/r.width*10}deg`);}
  function reset(){ref.current?.style.setProperty('--tilt-x','0deg');ref.current?.style.setProperty('--tilt-y','0deg');}
  return <div className={`scene scene-hero ${expanded?'stack-open':''}`} ref={ref} onPointerMove={tilt} onPointerLeave={reset} onPointerDown={down} onPointerUp={up} onPointerCancel={()=>{gesture.current=null;}} onClickCapture={e=>{if(performance.now()<suppressClick.current){e.preventDefault();e.stopPropagation();}}} data-paused={paused}>
    <div className="portrait-assembly">
      {photos.map((photo,index)=>{const slot=order.indexOf(index);return <button type="button" key={photo.id} className={`portrait-sheet ${slot===0?'portrait-glass':`portrait-backplate ${slot===1?'backplate-work':'backplate-personal'}`}`} data-slot={slot} data-photo-index={index} aria-label={`${slot===0?'Gambar utama:':'Tampilkan di depan:'} ${photo.title}`} aria-pressed={slot===0} onClick={()=>choose(index)} onKeyDown={e=>{if(slot===0&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();cycle(e.key==='ArrowRight'?1:-1,true);}}}>
        <div className={`portrait-window ${photo.id==='portrait'?'portrait-original':'portrait-art'}`}><img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} fetchPriority={index===0?'high':'auto'} loading={index===0?'eager':'lazy'}/></div>
        <span className="portrait-caption"><strong>{photo.title}</strong><span>{photo.id==='work'?`${PROJECTS.length} karya & eksperimen`:photo.caption}</span></span>
        <span className="portrait-sheen" aria-hidden="true"/><span className="glass-corner corner-one"/><span className="glass-corner corner-two"/>
      </button>;})}
      <div className="portrait-exploring"><Braces size={18}/><div><small>CURRENTLY EXPLORING</small><span>Web development<br/>& AI creative tech</span></div><ArrowUpRight size={15}/></div>
      <div className="portrait-location"><span aria-hidden="true" className="indonesia-flag"/><div><strong>INDONESIA</strong><span>Learning by building.</span></div></div>
      <span className="portrait-signature" aria-hidden="true">R_hmt.</span>
    </div>
    <div className="stack-controls"><button className="stack-toggle" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded} aria-controls="photo-choices"><Layers3 size={15}/>{expanded?'Rapatkan stack':'Buka stack'}<span aria-hidden="true">{expanded?'−':'+'}</span></button>
      <div hidden={!expanded} className="photo-choices" id="photo-choices" aria-label="Pilih gambar stack">{photos.map((photo,i)=><button key={photo.id} aria-label={`Tampilkan ${photo.title}`} aria-pressed={order[0]===i} onClick={()=>choose(i)}><span>{String(i+1).padStart(2,'0')}</span>{photo.title}</button>)}</div>
    </div>
    <span className="sr-only" aria-live="polite">Gambar utama: {photos[order[0]].title}</span>
  </div>;
}
