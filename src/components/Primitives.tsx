import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, X } from 'lucide-react';

export function Mark({ className = '' }: { className?: string }) {
  return <img src="/images/pp-dev.webp" width="44" height="44" className={`identity-mark ${className}`} alt="" aria-hidden="true"/>;
}

export function Chapter({ number, children, light = false }: { number: string; children: ReactNode; light?: boolean }) {
  return <p className={`chapter ${light ? 'chapter-light' : ''}`}><span>{number}</span><span className="chapter-line"/>{children}</p>;
}

export function ExternalLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}<ArrowUpRight size={15}/><span className="sr-only"> (tab baru)</span></a>;
}

export function VisitButton({ href, children = 'Kunjungi Website' }: { href: string; children?: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="visit-button"><span>{children}</span><ArrowUpRight size={15}/></a>;
}

export function SafeImage({ src, alt, className = '', ...props }: { src: string; alt: string; className?: string; width?: number; height?: number }) {
  const [failed, setFailed] = useState(!src);
  return failed ? <span className={`image-fallback ${className}`} role="img" aria-label={alt}>{alt.split(' ').map(x => x[0]).slice(0, 2).join('')}</span> : <img {...props} src={src} alt={alt} className={className} onError={() => setFailed(true)}/>;
}

export function Modal({ children, label, onClose, className = '' }: { children: ReactNode; label: string; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const focus = document.activeElement as HTMLElement | null;
    const dialog = ref.current; dialog?.showModal();
    document.documentElement.dataset.panelOpen='true';
    const old = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.documentElement.removeAttribute('data-panel-open'); document.body.style.overflow = old; focus?.focus({ preventScroll: true }); };
  }, []);

  return <dialog ref={ref} className={`modal ${className}`} aria-label={label} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal-content"><button className="icon-button modal-close" onClick={onClose} aria-label="Tutup panel"><X size={20}/></button>{children}</div>
  </dialog>;
}
