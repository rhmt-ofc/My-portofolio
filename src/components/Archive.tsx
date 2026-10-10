import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Search, X } from 'lucide-react';
import { PROJECTS, statusLabels } from '../data';
import type { Project } from '../types';
import { Chapter, Modal, VisitButton } from './Primitives';
import { useWorkShelf } from '../hooks/useWorkShelf';

const categories = [{ id: 'all', name: 'Semua' }, { id: 'AI Tools', name: 'AI & eksplorasi' }, { id: 'Utilities', name: 'Tools' }, { id: 'Productivity', name: 'Produktivitas' }, { id: 'Archive Experiments', name: 'Eksperimen' }];

export function WorkCover({ work }: { work: Project }) {
  return <div className={`work-cover cover-${work.id}`} data-spatial="project" data-project={work.id} role="img" aria-label={`Ilustrasi konsep ${work.name}`}><img className="spatial-fallback" src={`/components/works/${work.id}.svg`} alt="" aria-hidden="true"/></div>;
}

export default function Archive() {
  const [filter, setFilter] = useState('all'); const [query, setQuery] = useState('');
  const { shelf, position, visiblePosition, move, moveBy, handlers } = useWorkShelf(`${filter}\u0000${query}`);
  const [active, setActive] = useState<Project | null>(null);

  useEffect(() => { const sync = () => { if (location.hash.startsWith('#work-')) setActive(PROJECTS.find(p => `#work-${p.id}` === location.hash) || null); else setActive(null); }; sync(); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync); }, []);

  const list = PROJECTS.filter(w => (filter === 'all' || w.category === filter) && `${w.name} ${w.summary} ${w.ecosystem.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const selection = list;
  const cursor = Math.max(0, Math.min(position, selection.length - 1));

  function open(work: Project) {
    const target = document.querySelector(`[data-project="${work.id}"]`)?.getBoundingClientRect();
    if (target) {
      document.documentElement.style.setProperty('--work-origin-x', `${target.left + target.width / 2}px`);
      document.documentElement.style.setProperty('--work-origin-y', `${target.top + target.height / 2}px`);
    }
    location.hash = `#work-${work.id}`;
  }

  function close() { setActive(null); history.replaceState(null, '', '#archive'); }

  return <section className="archive section-pad" id="archive" aria-labelledby="archive-title">
    <div className="wrap">
      <Chapter number="01">THE DIGITAL ARCHIVE</Chapter>
      <div className="section-heading"><h2 id="archive-title">Selected Works.<br/><em>Build. Learn. Repeat.</em></h2><div><p>Kumpulan project dan eksperimen yang pernah aku buat. Beberapa masih berjalan, beberapa sudah archived tapi tetap dicatat sebagai bagian dari learning journey.</p><p className="micro-note">KLIK COVER / JUDUL UNTUK DETAIL</p></div></div>
      <div className="archive-toolbar"><div className="filter-list" aria-label="Filter karya">{categories.map(c => <button key={c.id} onClick={() => { setFilter(c.id); }} aria-pressed={filter === c.id} className={filter === c.id ? 'active' : ''}>{c.name}</button>)}</div><div className="search-box"><Search size={18}/><input type="text" placeholder="Cari karya..." value={query} onChange={e => setQuery(e.target.value)} aria-label="Cari proyek berdasarkan nama atau teknologi"/><button hidden={!query} onClick={() => setQuery('')} aria-label="Bersihkan pencarian"><X size={18}/></button></div></div>
      <p className="sr-only" role="status">{selection.length} karya ditemukan</p>
      <div className="shelf-navigation"><span>DRAG / SWIPE TO EXPLORE</span><div><span aria-live="polite">{selection.length ? String(cursor + 1).padStart(2, '0') : '00'} <small>/ {String(selection.length).padStart(2, '0')}</small></span><div className="nav-buttons"><button className="icon-button" onClick={() => moveBy(-1)} disabled={cursor <= 0} aria-label="Karya sebelumnya"><ArrowLeft size={18}/></button><button className="icon-button" onClick={() => moveBy(1)} disabled={cursor >= selection.length - 1} aria-label="Karya berikutnya"><ArrowRight size={18}/></button></div></div></div>
      <div ref={shelf} className="works-shelf" {...handlers} tabIndex={0} role="region" aria-label={`Rak ${selection.length} proyek; geser atau gunakan tombol panah`}>
      {selection.map((work, i) => <article className={`work-card ${visiblePosition === i ? 'shelf-current' : ''}`} key={work.id}>
        <button className="work-visual-button" onClick={() => open(work)} aria-label={`Baca cerita ${work.name}`}><WorkCover work={work}/><span className="work-open"><ArrowUpRight size={22}/></span></button>
        <div className="work-meta"><span>{String(i + 1).padStart(2, '0')} / {work.category}</span><span>{statusLabels[work.status]}</span></div>
        <button className="work-title" onClick={() => open(work)}><h3>{work.name}</h3><ArrowUpRight size={18}/></button>
        <p>{work.summary}</p>
        {work.url && <a className="visit-button card-visit" href={work.url} target="_blank" rel="noopener noreferrer"><span>Website</span><ArrowUpRight size={15}/></a>}
      </article>)}</div>
      {!selection.length && <div className="empty-state"><Search size={30}/><h3>Belum ketemu.</h3><p>Coba nama karya, teknologi, atau kata yang berbeda.</p><button className="text-link" onClick={() => setQuery('')}>Bersihkan pencarian</button></div>}
      {selection.length > 1 && <div className="shelf-track"><input type="range" min="0" max={selection.length - 1} value={cursor} aria-label="Pilih posisi pada rak karya" aria-valuetext={`Karya ${cursor + 1} dari ${selection.length}`} onChange={e => move(Number(e.target.value))}/></div>}
      <div className="archive-bottom"><span>Semua {PROJECTS.length} proyek tetap di arsip.</span><span className="micro-note">BUKA COVER / DESKRIPSI & STACK</span></div>
      {active && <Modal label={active.name} onClose={close} className="work-modal"><WorkCover work={active}/><h2>{active.name}</h2><p className="modal-summary">{active.description}</p><div className="work-stack"><strong>Stack:</strong><div className="tag-list">{active.ecosystem.map(t => <span key={t}>{t}</span>)}</div></div>{active.url && <div className="work-actions"><VisitButton href={active.url}/></div>}<p className="work-status">Status: {statusLabels[active.status]}</p></Modal>}
    </div>
  </section>;
}
