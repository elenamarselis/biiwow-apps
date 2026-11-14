'use client';
import { useEffect, useRef } from 'react';

export function Sheet({ title, onClose, children, full, footer }: {
  title: React.ReactNode; onClose: () => void; children: React.ReactNode; full?: boolean; footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const first = ref.current?.querySelector<HTMLElement>('[autofocus], input, button:not([data-close])');
    first?.focus();
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`sheet${full ? ' full' : ''}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} ref={ref}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="iconbtn sm" data-close onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line2)' }}>{footer}</div>}
      </div>
    </div>
  );
}
