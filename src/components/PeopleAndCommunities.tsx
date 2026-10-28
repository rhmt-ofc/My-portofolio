import { useState } from 'react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { PEOPLE, COMMUNITIES, asset } from '../data';
import { Chapter, ExternalLink, Modal, SafeImage } from './Primitives';
import type { Person } from '../types';

function WhatsAppIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

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
              <h3>The Communities.</h3>
            </div>
            <span className="micro-note">RUANG DISKUSI & EKOSISTEM</span>
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
                      width={72}
                      height={72}
                      className="flagship-avatar"
                    />
                    <img className="community-wa-mark" src="/images/tools/whatsapp.svg" alt="WhatsApp" width="20" height="20" />
                  </div>
                  <div>
                    <span className="flagship-tag">{flagship.title}</span>
                    <h4 className="flagship-title">{flagship.name}</h4>
                  </div>
                </div>
                <p className="flagship-desc">{flagship.tagline}</p>
                {flagship.url && (
                  <div className="flagship-action">
                    <ExternalLink href={flagship.url} className="button button-gold flagship-btn">
                      <WhatsAppIcon size={16} className="btn-wa-icon" />
                      <span>Gabung Komunitas Utama</span>
                    </ExternalLink>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub Communities Grid */}
          <div className="community-grid">
            {others.map((c, idx) => (
              <div key={c.name} className={`community-sub-card ${idx === 0 ? 'community-sub-card-featured' : ''}`}>
                <div className="sub-card-header">
                  <div className="sub-card-avatar-wrap">
                    <SafeImage
                      src={c.image.startsWith('/') ? c.image : asset(c.image)}
                      alt={c.name}
                      width={idx === 0 ? 54 : 48}
                      height={idx === 0 ? 54 : 48}
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
                  <span className="sub-card-status">{c.status || 'Grup Komunitas'}</span>
                  {c.url && (
                    <ExternalLink href={c.url} className="sub-card-join">
                      <WhatsAppIcon size={14} className="btn-wa-icon" />
                      <span>Gabung Grup</span>
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
