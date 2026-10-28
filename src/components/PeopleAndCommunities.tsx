import { useState } from 'react';
import { ArrowDown, ArrowUpRight, MessageCircle } from 'lucide-react';
import { PEOPLE, COMMUNITIES, asset } from '../data';
import { Chapter, ExternalLink, Modal, SafeImage } from './Primitives';
import type { Person } from '../types';

export default function PeopleAndCommunities() {
  const [all, setAll] = useState(false);
  const [person, setPerson] = useState<Person | null>(null);

  const flagship = COMMUNITIES.find(c => c.name === 'RHMT OFC') || COMMUNITIES[0];
  const others = COMMUNITIES.filter(c => c !== flagship);

  return (
    <section className="people section-pad" id="people" aria-labelledby="people-title">
      <div className="wrap">
        <Chapter number="07">COMMUNITIES & NETWORK</Chapter>
        <div className="section-heading">
          <h2 id="people-title">Spaces to connect.<br/><em>Never walked alone.</em></h2>
          <p>Komunitas resmi WhatsApp untuk berdiskusi, bereksperimen, serta jejaring perorangan tempat ide bertemu.</p>
        </div>

        {/* DOMINANT COMMUNITY SHOWCASE */}
        <div className="community-showcase-section">
          <div className="community-showcase-heading">
            <div>
              <span className="community-badge-pill">WhatsApp Communities</span>
              <h3>The Community.</h3>
            </div>
            <span className="micro-note">OFFICIAL DIGITAL HUBS</span>
          </div>

          {/* Flagship Community: RHMT OFC */}
          {flagship && (
            <div className="community-flagship-card">
              <div className="flagship-inner">
                <div className="flagship-brand">
                  <div className="flagship-avatar-wrap">
                    <SafeImage
                      src={flagship.image.startsWith('/') ? flagship.image : asset(flagship.image)}
                      alt={flagship.name}
                      width={76}
                      height={76}
                      className="flagship-avatar"
                    />
                    <img className="community-wa-mark" src="/images/tools/whatsapp.svg" alt="WhatsApp" width="22" height="22" />
                  </div>
                  <div>
                    <span className="flagship-tag">CENTRAL COMMUNITY HUB · VERIFIED</span>
                    <h4 className="flagship-title">{flagship.name}</h4>
                    <p className="flagship-subtitle">{flagship.title}</p>
                  </div>
                </div>
                <p className="flagship-desc">{flagship.tagline}</p>
                {flagship.url && (
                  <div className="flagship-action">
                    <ExternalLink href={flagship.url} className="button button-gold flagship-btn">
                      <MessageCircle size={16} />
                      <span>Gabung Komunitas Utama</span>
                      <ArrowUpRight size={17} />
                    </ExternalLink>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub Communities Grid */}
          <div className="community-grid">
            {others.map(c => (
              <div key={c.name} className="community-sub-card">
                <div className="sub-card-header">
                  <div className="sub-card-avatar-wrap">
                    <SafeImage
                      src={c.image.startsWith('/') ? c.image : asset(c.image)}
                      alt={c.name}
                      width={52}
                      height={52}
                      className="sub-card-avatar"
                    />
                    <img className="community-wa-mark-small" src="/images/tools/whatsapp.svg" alt="WhatsApp" width="16" height="16" />
                  </div>
                  <div className="sub-card-title-box">
                    <span className="sub-card-category">{c.title}</span>
                    <h5 className="sub-card-name">{c.name}</h5>
                  </div>
                </div>
                <p className="sub-card-desc">{c.tagline}</p>
                <div className="sub-card-footer">
                  <span className="sub-card-status">{c.status || 'Komunitas Terbuka'}</span>
                  {c.url && (
                    <ExternalLink href={c.url} className="button button-outline sub-card-join">
                      <span>Gabung</span>
                      <ArrowUpRight size={14} />
                    </ExternalLink>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PEOPLE ROSTER (BELOW COMMUNITY) */}
        <div className="people-section-divider">
          <div className="community-heading">
            <h3>People along the journey.</h3>
            <span className="micro-note">DISCUSSIONS, FRIENDS & PEERS</span>
          </div>
          <div className="people-roster">
            {PEOPLE.slice(0, all ? undefined : 8).map(p => (
              <button key={p.name} className="person-row" onClick={() => setPerson(p)}>
                <SafeImage src={asset(p.avatar)} alt={p.name} width={56} height={56} />
                <span><strong>{p.name}</strong><small>{p.role || `@${p.handle}`}</small></span>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
          <button className="text-link roster-more" onClick={() => setAll(x => !x)}>
            {all ? 'Ringkas daftar' : `Lihat seluruh jejaring (${PEOPLE.length})`}
            <ArrowDown size={16} />
          </button>
        </div>

        {/* Person Modal */}
        {person && (
          <Modal label={`Profil ${person.name}`} onClose={() => setPerson(null)} className="person-modal">
            <SafeImage src={asset(person.avatar)} alt={person.name} width={96} height={96} />
            <p className="eyebrow">PEOPLE ALONG THE JOURNEY</p>
            <h2>{person.name}</h2>
            <p>{person.role || `@${person.handle}`}</p>
            <div className="person-socials">
              {person.socials?.length ? person.socials.map(s => (
                <ExternalLink key={s.url} href={s.url} className="button button-outline">{s.label}</ExternalLink>
              )) : <p>Belum ada tautan publik dalam arsip.</p>}
            </div>
            <p className="asset-note">Tautan publik dari source portofolio. Ketersediaannya dapat berubah.</p>
          </Modal>
        )}
      </div>
    </section>
  );
}
