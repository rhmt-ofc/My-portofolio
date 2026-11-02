import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { ECOSYSTEM, PROJECTS } from '../data';
import { Chapter } from './Primitives';
import ToolIcon from './ToolIcon';
import TechnologyStack from './TechnologyStack';
const nodes = ECOSYSTEM.flatMap((g, group) => g.items.map(t => ({ ...t, group })));
export default function Ecosystem({ paused }: { paused: boolean }) {
  const [group, setGroup] = useState(0); const [selected, select] = useState<string | null>(null);
  const tool = nodes.find(n => n.name === selected);
  const related = tool ? PROJECTS.filter(p => p.ecosystem.some(t => t.toLowerCase() === tool.name.toLowerCase())) : [];
  const choose = (name: string, index: number) => { select(current => current === name ? null : name); setGroup(index); };
  return <section className="ecosystem section-pad" id="ecosystem" aria-labelledby="ecosystem-title"><div className="wrap">
    <Chapter number="04">UNDER THE GLASS / STACK & TOOLS</Chapter><div className="section-heading"><h2 id="ecosystem-title">Different tools.<br/><em>Masih eksplorasi.</em></h2><p>i cukup sering mencoba tools baru. Belum tentu semuanya dikuasai; yang dicari biasanya relevansi dan implementasinya dalam workflow.</p></div>
    <div className="ecosystem-layout"><TechnologyStack paused={paused}/>
    <div className="ecosystem-panel"><div className="ecosystem-tabs" role="tablist" aria-label="Kelompok teknologi">{ECOSYSTEM.map((g, i) => <button key={g.category} id={`group-tab-${i}`} role="tab" aria-selected={group === i} aria-controls="tool-panel" tabIndex={group === i ? 0 : -1} onClick={() => { setGroup(i); select(null); }} onKeyDown={e => { if (['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) { e.preventDefault(); const n = e.key === 'Home' ? 0 : e.key === 'End' ? 3 : (i + (e.key === 'ArrowLeft' ? 3 : 1)) % 4; setGroup(n); select(null); document.getElementById(`group-tab-${n}`)?.focus(); } }}>{g.category}</button>)}</div>
      {tool && <div className="tool-focus" key={tool.name} aria-live="polite"><ToolIcon name={tool.name}/><div><span className="eyebrow">SELECTED / {ECOSYSTEM[tool.group].category}</span><h3>{tool.name}</h3><p>{tool.description}</p>{related.length > 0 && <div className="tool-projects"><small>TERCATAT DI ARSIP</small>{related.map(p => <a key={p.id} href={`#work-${p.id}`}>{p.name}<ArrowUpRight size={12}/></a>)}</div>}</div></div>}
      <div className="tool-list" id="tool-panel" role="tabpanel" aria-labelledby={`group-tab-${group}`}>{ECOSYSTEM[group].items.map(t => <button className={`tool-row ${selected === t.name ? 'tool-row-selected' : ''}`} key={t.name} onClick={() => choose(t.name,group)}><span className="tool-glyph"><ToolIcon name={t.name}/></span><span><h3>{t.name}</h3><p>{t.description}</p></span><ArrowUpRight size={14}/></button>)}</div><p className="ecosystem-caption">{ECOSYSTEM.length} kategori · {nodes.length} tools. Pilih ikon untuk melihat perannya.</p>
    </div></div>
  </div></section>;
}
