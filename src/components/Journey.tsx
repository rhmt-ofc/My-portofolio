import { useState, type CSSProperties } from 'react';
import { ArrowRight, Terminal } from 'lucide-react';
import { JOURNEY_STEPS } from '../data';
import { Chapter } from './Primitives';
export default function Journey() {
  const [phase,setPhase]=useState(0);const current=JOURNEY_STEPS[phase];
  return <section className="journey section-pad" id="journey" aria-labelledby="journey-title"><div className="wrap"><Chapter number="03">THE EVOLUTION / 6 CHAPTERS</Chapter><div className="section-heading"><h2 id="journey-title">Dari tugas sekolah.<br/><em>Lalu keterusan.</em></h2><p>Pilih titik perjalanan untuk membuka konteksnya.<br/>Masih banyak yang perlu dipelajari.</p></div><div className="journey-layout">
    <aside className="journey-art"><div className="journey-workspace" data-phase={phase}>
      <div className="journey-platform" aria-hidden="true"/>
      <div className="journey-phone"><div className="phone-edge"/><div className="phone-screen"><div className="phone-status"><span>R_HMT</span><span>● ● ▰</span></div><div className="phone-camera"/><div className="phone-terminal" key={phase}><Terminal size={23}/><span className="phone-terminal-label">chapter / 0{phase+1}</span><strong>{current.phase.split('—')[1]?.trim()||current.phase}</strong><div className="phone-code"><span>const curiosity = true;</span><span>while (curiosity) {'{'}</span><b>  learn();</b><b>  build();</b><b>  iterate();</b><span>{'}'}</span></div><small>{current.techKeywords[0]}</small></div><span className="phone-home"/></div></div>
      <div className="journey-modules" aria-label="Modul perjalanan interaktif">{JOURNEY_STEPS.map((j,i)=><button type="button" onClick={()=>setPhase(i)} aria-label={`Buka fase ${i+1}: ${j.title}`} aria-pressed={phase===i} key={j.phase} className={`journey-module ${phase===i?'module-active':''}`} style={{'--module-index':i} as CSSProperties}><span>0{i+1}</span><strong>{j.techKeywords[0]}</strong><i aria-hidden="true"/></button>)}</div>
      <div className="journey-signal" key={phase} aria-hidden="true"/>
    </div>
      <div className="journey-route" aria-label="Pilih fase perjalanan">{JOURNEY_STEPS.map((j,i)=><button key={j.phase} onClick={()=>setPhase(i)} aria-label={`Fase ${i+1}: ${j.title}`} aria-pressed={phase===i}>{String(i+1).padStart(2,'0')}</button>)}</div><div className="journey-device-note"><span>OPPO A3S / PERANGKAT AWAL</span><a className="text-link" href={phase<3?'#ecosystem':'#archive'}>{phase<3?'Jelajahi tools yang dicoba':'Lihat arsip eksperimen'}<ArrowRight size={15}/></a></div>
    </aside>
    <div className="journey-timeline">{JOURNEY_STEPS.map((j,i)=><details key={j.phase} className={`journey-step ${phase===i?'journey-selected':''}`} open={phase===i}><summary onClick={e=>{e.preventDefault();setPhase(i);}}><span className="phase-number">0{i+1}</span><span><small>{j.phase.split('—')[1]?.trim()||j.phase}</small><h3>{j.title}</h3></span><span className="details-plus">+</span></summary><div className="journey-details"><p className="journey-subtitle">{j.subtitle}</p><p>{j.description}</p><div className="tag-list">{j.techKeywords.map(t=><span key={t}>{t}</span>)}</div>{j.environment&&<p className="device-note">Perangkat awal: {j.environment.device} · {j.environment.learning}</p>}</div></details>)}</div>
  </div></div></section>;
}
