import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { ANIME } from '../data/anime';
import { Chapter, Modal } from './Primitives';
import VideoPlayer from './VideoPlayer';
export default function Personal() {
  const [active, setActive] = useState<(typeof ANIME)[number] | null>(null);
  return <section className="personal section-pad" id="universe" aria-labelledby="universe-title"><div className="wrap">
    <Chapter number="05">THE PERSONAL UNIVERSE</Chapter>
    <div className="section-heading"><h2 id="universe-title">My Waifu.<br/><em>A little more me.</em></h2><p>Selain teknologi, i juga suka anime, terutama Classroom of the Elite. Elaina jadi favorit utama, bareng Arisu Sakayanagi dan Hiyori Shiina.</p></div>
    <div className="anime-gallery" aria-label="Karakter favorit R_HMT">{ANIME.map((a, i) => <button className={`anime-card anime-${a.id}`} data-depth key={a.id} onClick={() => setActive(a)} aria-label={`Tentang ${a.name}`}><div className="anime-portrait"><img src={a.image} alt={a.name} loading="lazy" width="600" height="900"/><span className="anime-number">0{i + 1} / {i === 0 ? 'THE FAVORITE' : a.label}</span></div><div className="anime-label"><span>{a.label}</span><h3>{a.name}<ArrowUpRight size={18}/></h3><p>{a.note}</p></div></button>)}</div>
    <VideoPlayer/>
    <figure className="royal-scene"><div className="royal-art"><img src="/images/anime-v22/duo.jpg" alt="Ayanokouji dan Arisu Sakayanagi, komposisi gambar utuh" width="736" height="981" loading="lazy"/></div><figcaption><span className="eyebrow">CLASSROOM OF THE ELITE</span><h3>Kings <em>&</em> Queen.</h3><p>Ayanokouji × Arisu Sakayanagi.<br/>Dua cara berpikir, satu permainan yang belum selesai.</p></figcaption><span className="royal-frame" aria-hidden="true"/></figure>
    {active && <Modal label={active.name} onClose={() => setActive(null)} className="anime-modal"><img src={active.image} alt={active.name} width="600" height="900"/><div><p className="eyebrow">{active.origin}</p><h2>{active.name}</h2><p>{active.note}</p></div></Modal>}
  </div></section>;
}
