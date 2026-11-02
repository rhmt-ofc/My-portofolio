import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ArrowUpRight, Pause, Play, RotateCcw } from 'lucide-react';
import { ECOSYSTEM } from '../data';
import ToolIcon from './ToolIcon';
import { Mark } from './Primitives';
import { ORBIT_LANES, orbitLayout, orbitPath, orbitPoint, advanceOrbit, shouldAnimateOrbit } from '../interaction/orbit.mjs';
const nodes = ECOSYSTEM.flatMap((group, category) => group.items.map(tool => ({...tool,category})));
const STARS = [
  { x: 130, y: 220, r: 1.2, o: 0.35 },
  { x: 260, y: 140, r: 1.0, o: 0.25 },
  { x: 770, y: 160, r: 1.4, o: 0.4 },
  { x: 880, y: 280, r: 0.9, o: 0.3 },
  { x: 920, y: 490, r: 1.3, o: 0.35 },
  { x: 850, y: 720, r: 1.1, o: 0.25 },
  { x: 750, y: 880, r: 1.5, o: 0.4 },
  { x: 500, y: 940, r: 1.0, o: 0.3 },
  { x: 240, y: 860, r: 1.3, o: 0.35 },
  { x: 100, y: 740, r: 0.9, o: 0.25 },
  { x: 80, y: 480, r: 1.2, o: 0.3 },
  { x: 170, y: 340, r: 1.0, o: 0.25 },
  { x: 670, y: 230, r: 0.8, o: 0.2 },
  { x: 340, y: 770, r: 1.1, o: 0.3 },
  { x: 640, y: 820, r: 0.9, o: 0.25 },
  { x: 430, y: 110, r: 1.2, o: 0.35 },
];
type Props = { paused?: boolean; compact?: boolean; selected?: string | null; onSelect?: (name:string,group:number)=>void };
type Gesture = { id:number; x:number; y:number; rotation:number; moved:boolean; at:number };
export default function ToolOrbit({paused=false,compact=false,selected=null,onSelect}:Props) {
  const host=useRef<HTMLDivElement>(null), rotation=useRef(0), time=useRef(0), momentum=useRef(0);
  const gesture=useRef<Gesture|null>(null), suppress=useRef(false), frame=useRef(0);
  const [localPause,setLocalPause]=useState(false),[focus,setFocus]=useState<string|null>(null);
  const initial=orbitLayout(),current=selected||focus;
  useEffect(()=>{
    const el=host.current; if(!el)return;
    const buttons=Array.from(el.querySelectorAll<HTMLElement>('.orbit-node'));
    buttons.forEach(button=>{button.style.left='50%';button.style.top='50%';});
    const runners=Array.from(el.querySelectorAll<SVGCircleElement>('.orbit-runner'));
    const auras=Array.from(el.querySelectorAll<SVGCircleElement>('.orbit-runner-aura'));
    const trails=Array.from(el.querySelectorAll<SVGCircleElement>('.orbit-trail'));
    let visible=false,last=0,drawAt=0;
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const draw=()=>{
      const points=orbitLayout(time.current,rotation.current),width=el.clientWidth,height=el.clientHeight;
      points.forEach((point,i)=>{const button=buttons[i];if(!button)return;button.style.transform=`translate3d(${(point.x-.5)*width}px,${(point.y-.5)*height}px,0) translate(-50%,-50%) scale(${.91+point.z*.07})`;button.style.zIndex=String(5+Math.round((point.z+1)*2));});
      ORBIT_LANES.forEach((lane,i)=>{
        const baseAngle=time.current*lane.speed+rotation.current+lane.phase+(lane.count?Math.PI/lane.count:.7);
        const point=orbitPoint(lane,baseAngle);
        if(runners[i]){runners[i].setAttribute('cx',String(point.x*1000));runners[i].setAttribute('cy',String(point.y*1000));}
        if(auras[i]){auras[i].setAttribute('cx',String(point.x*1000));auras[i].setAttribute('cy',String(point.y*1000));}
        if(i>=2){
          const offset=(i-2)*3;
          [1,2,3].forEach((t,idx)=>{
            const trailAngle=baseAngle-t*0.09*Math.sign(lane.speed||1);
            const tp=orbitPoint(lane,trailAngle);
            const tr=trails[offset+idx];
            if(tr){tr.setAttribute('cx',String(tp.x*1000));tr.setAttribute('cy',String(tp.y*1000));}
          });
        }
      });
    };
    const canMove=()=>shouldAnimateOrbit({visible,hidden:document.hidden,paused:paused||localPause||document.documentElement.dataset.motion==='off',reduced:media.matches,selected:!!current,interacting:!!gesture.current,blocked:document.documentElement.hasAttribute('data-intro')||document.documentElement.hasAttribute('data-panel-open')||document.documentElement.dataset.heroCovered==='true'});
    const tick=(now:number)=>{frame.current=0;if(!canMove())return;if(!drawAt||now-drawAt>=32){const dt=last?Math.min(.08,(now-last)/1000):0;last=now;drawAt=now;const next=advanceOrbit({time:time.current,rotation:rotation.current,momentum:momentum.current},dt);time.current=next.time;rotation.current=next.rotation;momentum.current=next.momentum;draw();}frame.current=requestAnimationFrame(tick);};
    const wake=()=>{cancelAnimationFrame(frame.current);frame.current=0;last=0;drawAt=0;draw();el.dataset.moving=canMove()?'true':'false';if(canMove())frame.current=requestAnimationFrame(tick);};
    const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;wake();},{rootMargin:'40px'});io.observe(el);
    const changes=new MutationObserver(wake);changes.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion','data-intro','data-panel-open','data-hero-covered']});
    const resize=new ResizeObserver(wake);resize.observe(el);
    document.addEventListener('visibilitychange',wake);media.addEventListener('change',wake);el.addEventListener('rhmt:orbit-draw',wake);draw();
    return()=>{cancelAnimationFrame(frame.current);frame.current=0;io.disconnect();changes.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',wake);media.removeEventListener('change',wake);el.removeEventListener('rhmt:orbit-draw',wake);};
  },[paused,localPause,current]);
  const redraw=()=>host.current?.dispatchEvent(new Event('rhmt:orbit-draw'));
  function release(e:PointerEvent<HTMLDivElement>,cancelled=false){const g=gesture.current;if(!g||g.id!==e.pointerId)return;gesture.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);e.currentTarget.classList.remove('orbit-dragging');if(cancelled)momentum.current=0;redraw();}
  const active=nodes.find(tool=>tool.name===current);
  return <div className={`orbit-experience ${compact?'orbit-compact':''}`}>
    <div className="tool-universe" ref={host} aria-label="Semesta interaktif 19 tools" onPointerLeave={e=>{if(gesture.current&&!e.currentTarget.hasPointerCapture(gesture.current.id)){gesture.current=null;redraw();}}}
      onPointerDown={e=>{if(!e.isPrimary||e.button!==0)return;suppress.current=false;momentum.current=0;gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,rotation:rotation.current,moved:false,at:performance.now()};redraw();}}
      onPointerMove={e=>{const g=gesture.current;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(!g.moved){if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){gesture.current=null;redraw();return;}if(Math.abs(dx)<10)return;g.moved=true;suppress.current=true;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.classList.add('orbit-dragging');}e.preventDefault();const now=performance.now(),dt=Math.max(.008,(now-g.at)/1000),next=g.rotation+dx/e.currentTarget.clientWidth*2.8;momentum.current=Math.max(-.7,Math.min(.7,(next-rotation.current)/dt));g.at=now;rotation.current=next;redraw();}}
      onPointerUp={e=>release(e)} onPointerCancel={e=>release(e,true)} onLostPointerCapture={e=>release(e)}
      onClickCapture={e=>{if(suppress.current&&e.detail>0){e.preventDefault();e.stopPropagation();suppress.current=false;}}}
      onKeyDown={e=>{if(e.key==='Escape'){setFocus(null);if(selected)onSelect?.(selected,nodes.find(n=>n.name===selected)?.category||0);}}}>
      <svg className="orbit-rails" viewBox="0 0 1000 1000" aria-hidden="true">
        <defs>
          <linearGradient id={compact?'orbit-silver-hero':'orbit-silver-tools'} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="currentColor" stopOpacity=".12"/>
            <stop offset=".45" stopColor="currentColor" stopOpacity=".85"/>
            <stop offset=".7" stopColor="currentColor" stopOpacity=".25"/>
            <stop offset="1" stopColor="currentColor" stopOpacity=".7"/>
          </linearGradient>
          <radialGradient id="runner-glow-silver" cx=".5" cy=".5" r=".5">
            <stop offset="0%" stopColor="#ffffff" stopOpacity=".95"/>
            <stop offset="35%" stopColor="#e2e8f0" stopOpacity=".6"/>
            <stop offset="70%" stopColor="#94a3b8" stopOpacity=".2"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="runner-electron-silver" cx=".38" cy=".32" r=".7">
            <stop offset="0%" stopColor="#ffffff"/>
            <stop offset="45%" stopColor="#f8fafc"/>
            <stop offset="85%" stopColor="#cbd5e1"/>
            <stop offset="100%" stopColor="#64748b"/>
          </radialGradient>
          <radialGradient id={compact?'orbit-ball-hero':'orbit-ball-tools'} cx=".3" cy=".25" r=".8">
            <stop stopColor="#fff"/>
            <stop offset=".25" stopColor="#d8e2f1"/>
            <stop offset=".55" stopColor="#7185a1"/>
            <stop offset=".85" stopColor="#202c40"/>
            <stop offset="1" stopColor="#c8d1e2"/>
          </radialGradient>
        </defs>
        <g className="orbit-stars">
          {STARS.map((s,idx)=><circle key={idx} cx={s.x} cy={s.y} r={s.r} fill="#e2e8f0" opacity={s.o} className="orbit-star"/>)}
        </g>
        {ORBIT_LANES.map((lane,i)=><g key={i}>
          <path d={orbitPath(lane)} className="orbit-rail-shadow"/>
          <path d={orbitPath(lane)} stroke={`url(#${compact?'orbit-silver-hero':'orbit-silver-tools'})`} className={`orbit-rail ${i>=2?'orbit-rail-accent':''}`}/>
          <circle className="orbit-runner-aura" fill="url(#runner-glow-silver)" cx="500" cy="500" r={i>=2?24:0} opacity={i>=2?0.8:0}/>
          {i>=2 && [1,2,3].map(t=><circle key={t} className="orbit-trail" fill="url(#runner-glow-silver)" cx="500" cy="500" r={8-t*1.8} opacity={0.65-t*0.18}/>)}
          <circle className="orbit-runner" fill={i>=2?'url(#runner-electron-silver)':`url(#${compact?'orbit-ball-hero':'orbit-ball-tools'})`} cx="500" cy="500" r={i>=2?9:(i===1?11:8)}/>
        </g>)}
      </svg>
      <div className="orbit-core"><div className="orbit-core-glow"/><div className="orbit-core-rim"/><Mark/><span>R_HMT</span><small>{nodes.length} TOOLS / STILL EXPLORING</small></div>
      {nodes.map((node,i)=><button className={`orbit-node ${current===node.name?'orbit-node-selected':''}`} style={{left:`${initial[i].x*100}%`,top:`${initial[i].y*100}%`}} key={node.name} aria-label={`Jelajahi ${node.name}`} aria-pressed={current===node.name}
        onClick={()=>{momentum.current=0;if(onSelect)onSelect(node.name,node.category);else setFocus(value=>value===node.name?null:node.name);}}><ToolIcon name={node.name}/><span className="orbit-tooltip">{node.name}</span></button>)}
    </div>
    {compact?<div className="hero-orbit-foot"><span>{active?active.name:'MY TECHNOLOGY UNIVERSE'}</span><a href="#ecosystem" aria-label="Lihat seluruh tools">Explore<ArrowUpRight size={13}/></a>{active&&<p className="hero-tool-note" aria-live="polite">{active.description}</p>}</div>:<div className="orbit-controls"><span>GESER ORBIT · PILIH IKON</span><button onClick={()=>setLocalPause(v=>!v)} aria-label={localPause?'Putar orbit':'Jeda orbit'} aria-pressed={localPause}>{localPause?<Play size={15}/>:<Pause size={15}/>}</button><button aria-label="Reset orbit" onClick={()=>{rotation.current=0;time.current=0;momentum.current=0;setFocus(null);if(selected)onSelect?.(selected,nodes.find(n=>n.name===selected)?.category||0);redraw();}}><RotateCcw size={15}/></button></div>}
  </div>;
}
