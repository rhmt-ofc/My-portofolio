import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Menu, Braces, Smartphone, Pause, Play, Sun, Moon } from 'lucide-react';
import { ECOSYSTEM, PROFILE, PROJECTS } from './data';
import { Chapter, ExternalLink, Mark, Modal } from './components/Primitives';
import Scene from './components/Scene';
import ToolOrbit from './components/ToolOrbit';
import RelayMark from './components/RelayMark';
import Ratings from './components/Ratings';
import Archive from './components/Archive';
import Ecosystem from './components/Ecosystem';
import Journey from './components/Journey';
import SplashScreen from './components/SplashScreen';
import AiSandbox from './components/AiSandbox';
import PeopleAndCommunities from './components/PeopleAndCommunities';
import Personal from './components/Personal';
import { useMotion } from './hooks/useMotion';
import { useExperience } from './hooks/useExperience';
import { useScrollScenes } from './hooks/useScrollScenes';
import { useTheme } from './hooks/useTheme';
const links=[{id:'home',name:'Home'},{id:'about',name:'About'},{id:'archive',name:'Work'},{id:'journey',name:'Journey'},{id:'ecosystem',name:'Tools'},{id:'universe',name:'Waifu'},{id:'lab',name:'Relay'},{id:'people',name:'Jejaring'},{id:'contact',name:'Contact'}];
export default function App() {
  const reduced=useMotion(),[motionPaused,setMotionPaused]=useState(false),{theme,toggle}=useTheme();
  const [menu,setMenu]=useState(false),[current,setCurrent]=useState('home');
  const still=reduced||motionPaused;
  useExperience(!still);
  useScrollScenes(!still);
  useEffect(()=>{const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){setCurrent(e.target.id);document.documentElement.dataset.chapter=e.target.id;}});},{rootMargin:'-15% 0px -60% 0px'});document.querySelectorAll('main section[id],footer[id]').forEach(el=>io.observe(el));return()=>io.disconnect();},[]);
  return <><SplashScreen/><a className="skip-link" href="#main">Lewati ke konten</a>
    <header className="site-header"><div className="header-inner"><a href="#home" className="brand" aria-label="R_HMT, kembali ke awal"><Mark/><span>R_HMT</span></a>
      <nav className="desktop-nav" aria-label="Navigasi utama">{links.filter(l=>['home','about','archive','universe','contact'].includes(l.id)).map(l=><a className={current===l.id?'nav-active':''} href={`#${l.id}`} key={l.id} aria-current={current===l.id?'location':undefined}>{l.name}</a>)}</nav>
      <div className="header-actions"><button className="theme-toggle" onClick={toggle} aria-label={theme==='dark'?'Aktifkan light mode':'Aktifkan dark mode'}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button><button className="global-motion" aria-label={motionPaused?'Aktifkan animasi halaman':'Jeda animasi halaman'} aria-pressed={motionPaused} onClick={()=>setMotionPaused(x=>!x)}>{motionPaused?<Play size={16}/>:<Pause size={16}/>}</button><button className="menu-button" onClick={()=>setMenu(true)} aria-label="Buka menu navigasi" aria-expanded={menu}><Menu size={22}/></button></div>
    </div></header>
    {menu&&<Modal label="Menu navigasi" onClose={()=>setMenu(false)} className="navigation-modal"><p className="eyebrow">R_HMT / EXPLORE THE ARCHIVE</p><nav aria-label="Semua bagian">{links.map((l,i)=><a key={l.id} href={`#${l.id}`} onClick={()=>setMenu(false)}><span>{String(i+1).padStart(2,'0')}</span>{l.name}<ArrowUpRight size={22}/></a>)}</nav></Modal>}
    <main id="main">
      <div className="opening-sequence">
      <section className="hero" id="home" aria-labelledby="hero-title">
        <div className="hero-room" aria-hidden="true"><span className="hero-light-streak"/><span className="hero-light-streak streak-second"/></div>
        <div className="wrap hero-grid"><div className="hero-copy"><p className="hero-eyebrow"><span className="tiny-square" aria-hidden="true"/>A PERSONAL DIGITAL ARCHIVE</p><h1 id="hero-title">Learning<br/><em>in Progress.</em></h1><p className="hero-description">Aku R_HMT. Belajar web development lewat proyek, eksperimen, dan kolaborasi bersama AI. Masih mencari pendekatan yang paling masuk akal, tapi selalu ingin berkembang.</p><div className="hero-cta"><a className="button button-gold" href="#archive">Jelajahi karya<ArrowRight size={16}/></a><a href="#journey" className="text-link">Baca perjalanan<ArrowRight size={16}/></a></div><div className="hero-inventory" aria-label="Isi portofolio"><a href="#archive"><strong>{PROJECTS.length}</strong><span>Karya & eksperimen</span></a><a href="#ecosystem"><strong>{ECOSYSTEM.reduce((n,g)=>n+g.items.length,0)}</strong><span>Tools yang dicoba</span></a><a href="#journey"><strong aria-hidden="true">∞</strong><span>Masih belajar<span className="sr-only">, perjalanan yang terus berlanjut</span></span></a></div><div className="hero-identity"><span className="identity-line"/><div><strong>SELF-TAUGHT. ALWAYS CURIOUS.</strong><span>Rohmatulloh / R_HMT OFC · Pelajar MA · Indonesia</span></div></div></div>
          <div className="hero-object"><Scene paused={still}/></div><div className="hero-universe"><ToolOrbit compact paused={still}/><p className="hero-universe-note">Different tools.<br/>Same curiosity.</p></div>
          <a className="scroll-note" href="#archive"><ArrowDown size={14}/><span>EXPLORE AT YOUR OWN PACE</span></a><span className="hero-corner">STILL A STUDENT. ALWAYS CURIOUS.</span>
        </div>
      </section>
      <Archive/>
      </div>
      <section className="about section-pad" id="about" aria-labelledby="about-title"><div className="wrap about-grid"><div><Chapter number="02">BEYOND THE CODE</Chapter><h2 id="about-title">How it started.<br/><em>Sedikit konteks.</em></h2><span className="about-signature">R_hmt.</span><div className="about-values"><span><Smartphone size={18}/>Mobile beginnings</span><span><Braces size={18}/>Learning by building</span><span><RelayMark/>Human × AI</span></div></div><div className="about-copy"><p className="lead">{PROFILE.about}</p><p>{PROFILE.motivation}</p><p>{PROFILE.approach}</p></div></div></section>
      <Journey/><Ecosystem paused={still}/><Personal/><AiSandbox/><PeopleAndCommunities/>
      <section className="ethos section-pad" id="ethos" aria-labelledby="ethos-title"><div className="wrap"><Chapter number="08">THE ETHOS</Chapter><p className="eyebrow" id="ethos-title">A NOTE TO MYSELF</p><blockquote><span className="ethos-line">“Masih belajar.</span><span className="ethos-line">Masih <em>mencoba.</em>”</span></blockquote><div className="ethos-bottom"><span className="about-signature">R_hmt.</span><p>{PROFILE.ethos}</p></div></div></section>
      <Ratings paused={still}/>
      <footer className="footer section-pad" id="contact"><div className="wrap"><p className="eyebrow">IDE, PERTANYAAN, ATAU SEKADAR MENYAPA?</p><div className="footer-heading"><h2>Let’s start<br/><em>a conversation.</em></h2><a href={PROFILE.socials[1].url} className="contact-circle" target="_blank" rel="noopener noreferrer" aria-label="Hubungi R_HMT melalui Telegram"><ArrowUpRight size={34}/></a></div><div className="footer-socials">{PROFILE.socials.map(s=><ExternalLink href={s.url} key={s.name}><span>{s.name}</span><small>{s.handle}</small></ExternalLink>)}</div><div className="footer-bottom"><a href="#home" className="brand"><Mark/><span>R_HMT</span></a><p>© {new Date().getFullYear()} R_HMT OFC.<br/>Catatan proyek dan proses belajar.</p><a href="#home" className="back-top">Kembali ke awal<ArrowUpRight size={16}/></a></div></div></footer>
    </main></>;
}
