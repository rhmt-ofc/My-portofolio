import { useEffect, useRef, useState } from 'react';
import BinaryAvatar from './BinaryAvatar';
import { introProgress } from '../interaction/intro.mjs';
export default function SplashScreen() {
  const dialog=useRef<HTMLDialogElement>(null),closed=useRef(false),exit=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const [show,setShow]=useState(true),[leaving,setLeaving]=useState(false),[progress,setProgress]=useState(1);
  function finish(){if(closed.current)return;closed.current=true;setProgress(100);setLeaving(true);exit.current=setTimeout(()=>{setShow(false);document.documentElement.removeAttribute('data-intro');window.dispatchEvent(new Event('rhmt:intro-complete'));},matchMedia('(prefers-reduced-motion: reduce)').matches?80:520);}
  useEffect(()=>{
    let active=true,ready=false,frame=0,last=0;
    closed.current=false;setShow(true);setProgress(1);setLeaving(false);document.documentElement.dataset.intro='on';
    const start=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const theme=document.documentElement.dataset.theme==='light'?'light':'dark';
    const images=['/images/pp-dev-icon.webp',`/images/glass/${theme}-960.webp`];
    let hold:ReturnType<typeof setTimeout>|undefined;
    const pending:HTMLImageElement[]=[];
    const load=(src:string)=>new Promise<void>(resolve=>{const image=new Image();pending.push(image);image.onload=image.onerror=()=>resolve();image.src=src;});
    Promise.all([...images.map(load),document.fonts.ready]).then(()=>{ready=true;});
    const tick=(now:number)=>{
      if(!active||closed.current)return;
      if(now-last>=50){last=now;const next=introProgress(now-start,ready,reduced.matches);setProgress(next);if(next===100){hold=setTimeout(finish,reduced.matches?40:240);return;}}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    const deadline=setTimeout(()=>{if(active&&!closed.current&&hold===undefined){cancelAnimationFrame(frame);setProgress(100);hold=setTimeout(finish,reduced.matches?40:240);}},reduced.matches?650:5200);
    return()=>{active=false;cancelAnimationFrame(frame);pending.forEach(image=>{image.onload=image.onerror=null;});clearTimeout(deadline);clearTimeout(hold);clearTimeout(exit.current);document.documentElement.removeAttribute('data-intro');};
  },[]);
  useEffect(()=>{if(!show)return;const old=document.body.style.overflow,focus=document.activeElement as HTMLElement|null;document.body.style.overflow='hidden';dialog.current?.close();dialog.current?.showModal();return()=>{dialog.current?.close();document.body.style.overflow=old;focus?.focus({preventScroll:true});};},[show]);
  if(!show)return null;
  return <dialog open ref={dialog} className={`intro-screen ${leaving?'intro-leaving':''}`} aria-label="Intro R_HMT" onCancel={e=>{e.preventDefault();finish();}}>
    <div className="intro-stage" aria-hidden="true"><span className="intro-panel intro-panel-one"/><span className="intro-panel intro-panel-two"/><span className="intro-panel intro-panel-three"/><div className="intro-identity"><BinaryAvatar progress={progress}/></div><span className="intro-orbit"/><span className="intro-scan"/></div>
    <div className="intro-copy"><p className="eyebrow">R_HMT / PERSONAL ARCHIVE</p><h2>Learning <em>in Progress.</em></h2><div className="intro-progress-caption"><span>{progress===100?'READY TO EXPLORE':'LOADING'}</span><output aria-label="Progres intro" aria-live="off">{String(progress).padStart(2,'0')}<small>%</small></output></div><div className="intro-load" role="progressbar" aria-label="Progres pembukaan portofolio" aria-valuemin={1} aria-valuemax={100} aria-valuenow={progress}><span style={{transform:`scaleX(${progress/100})`}}/></div><span>MEMBUKA RUANG EKSPLORASI.</span></div><button className="intro-skip" onClick={finish}>Lewati intro ↗</button>
  </dialog>;
}
