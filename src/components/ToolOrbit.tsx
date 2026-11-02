import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ArrowUpRight, Pause, Play, RotateCcw } from 'lucide-react';
import { ECOSYSTEM } from '../data';
import ToolIcon from './ToolIcon';
import { Mark } from './Primitives';
import { ORBIT_LANES, orbitLayout, orbitPath, orbitPoint, advanceOrbit, shouldAnimateOrbit } from '../interaction/orbit.mjs';
const nodes = ECOSYSTEM.flatMap((group, category) => group.items.map(tool => ({...tool,category})));
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
    let visible=false,last=0,drawAt=0;
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const draw=()=>{
      const points=orbitLayout(time.current,rotation.current),width=el.clientWidth,height=el.clientHeight;
      points.forEach((point,i)=>{const button=buttons[i];if(!button)return;button.style.transform=`translate3d(${(point.x-.5)*width}px,${(point.y-.5)*height}px,0) translate(-50%,-50%) scale(${.91+point.z*.07})`;button.style.zIndex=String(5+Math.round((point.z+1)*2));});
      ORBIT_LANES.forEach((lane,i)=>{const point=orbitPoint(lane,time.current*lane.speed+rotation.current+lane.phase+(lane.count?Math.PI/lane.count:.7));if(runners[i]){runners[i].setAttribute('cx',String(point.x*1000));runners[i].setAttribute('cy',String(point.y*1000));}if(auras[i]){auras[i].setAttribute('cx',String(point.x*1000));auras[i].setAttribute('cy',String(point.y*1000));}});
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
            <stop offset=".45" stopColor="currentColor" stopOpacity=".8"/>
            <stop offset=".7" stopColor="currentColor" stopOpacity=".25"/>
            <stop offset="1" stopColor="currentColor" stopOpacity=".65"/>
          </linearGradient>
          <linearGradient id="orbit-laser-stream" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#00f0ff" stopOpacity=".95"/>
            <stop offset=".4" stopColor="#3b82f6" stopOpacity=".7"/>
            <stop offset=".8" stopColor="#8b5cf6" stopOpacity=".2"/>
            <stop offset="1" stopColor="#000" stopOpacity="0"/>
          </linearGradient>
          <radialGradient id="runner-glow" cx=".5" cy=".5" r=".5">
            <stop offset="0%" stopColor="#ffffff" stopOpacity=".95"/>
            <stop offset="30%" stopColor="#00f0ff" stopOpacity=".8"/>
            <stop offset="70%" stopColor="#3b82f6" stopOpacity=".25"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="runner-electron" cx=".38" cy=".32" r=".7">
            <stop offset="0%" stopColor="#ffffff"/>
            <stop offset="40%" stopColor="#a5f3fc"/>
            <stop offset="80%" stopColor="#00f0ff"/>
            <stop offset="100%" stopColor="#0284c7"/>
          </radialGradient>
          <radialGradient id={compact?'orbit-ball-hero':'orbit-ball-tools'} cx=".3" cy=".25" r=".8">
            <stop stopColor="#fff"/>
            <stop offset=".25" stopColor="#d8e2f1"/>
            <stop offset=".55" stopColor="#7185a1"/>
            <stop offset=".85" stopColor="#202c40"/>
            <stop offset="1" stopColor="#c8d1e2"/>
          </radialGradient>
        </defs>
        {ORBIT_LANES.map((lane,i)=><g key={i}>
          <path d={orbitPath(lane)} className="orbit-rail-shadow"/>
          <path d={orbitPath(lane)} stroke={`url(#${compact?'orbit-silver-hero':'orbit-silver-tools'})`} className="orbit-rail"/>
          {i===2 && <path d={orbitPath(lane)} stroke="url(#orbit-laser-stream)" className="orbit-rail-laser"/>}
          <circle className="orbit-runner-aura" fill="url(#runner-glow)" cx="500" cy="500" r={i===2?28:0} opacity={i===2?0.85:0}/>
          <circle className="orbit-runner" fill={i===2?'url(#runner-electron)':`url(#${compact?'orbit-ball-hero':'orbit-ball-tools'})`} cx="500" cy="500" r={i===2?9:(i===1?11:7)}/>
        </g>)}
      </svg>
      <div className="orbit-core"><div className="orbit-core-nebula" aria-hidden="true"/><div className="orbit-core-rim"/><Mark/><span>R_HMT</span><small>{nodes.length} TOOLS / STILL EXPLORING</small></div>
      {nodes.map((node,i)=><button className={`orbit-node ${current===node.name?'orbit-node-selected':''}`} style={{left:`${initial[i].x*100}%`,top:`${initial[i].y*100}%`}} key={node.name} aria-label={`Jelajahi ${node.name}`} aria-pressed={current===node.name}
        onClick={()=>{momentum.current=0;if(onSelect)onSelect(node.name,node.category);else setFocus(value=>value===node.name?null:node.name);}}><ToolIcon name={node.name}/><span className="orbit-tooltip">{node.name}</span></button>)}
    </div>
    {compact?<div className="hero-orbit-foot"><span>{active?active.name:'MY TECHNOLOGY UNIVERSE'}</span><a href="#ecosystem" aria-label="Lihat seluruh tools">Explore<ArrowUpRight size={13}/></a>{active&&<p className="hero-tool-note" aria-live="polite">{active.description}</p>}</div>:<div className="orbit-controls"><span>GESER ORBIT · PILIH IKON</span><button onClick={()=>setLocalPause(v=>!v)} aria-label={localPause?'Putar orbit':'Jeda orbit'} aria-pressed={localPause}>{localPause?<Play size={15}/>:<Pause size={15}/>}</button><button aria-label="Reset orbit" onClick={()=>{rotation.current=0;time.current=0;momentum.current=0;setFocus(null);if(selected)onSelect?.(selected,nodes.find(n=>n.name===selected)?.category||0);redraw();}}><RotateCcw size={15}/></button></div>}
  </div>;
}
