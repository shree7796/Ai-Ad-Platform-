'use client';

import type { ReactNode, TextareaHTMLAttributes } from 'react';
import { Plus } from 'lucide-react';

/** Krea-style single pill: prompt on top, chip toolbar + round action below. */
export function KreaDockRoot({ children }: { children: ReactNode }) {
  return <div className="krea-dock">{children}</div>;
}

export function KreaDockPrompt(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`krea-dock-prompt ${props.className ?? ''}`.trim()} />;
}

export function KreaDockToolbar({ children }: { children: ReactNode }) {
  return <div className="krea-dock-toolbar">{children}</div>;
}

export function KreaDockChipRow({ children }: { children: ReactNode }) {
  return <div className="krea-dock-chip-row">{children}</div>;
}

export function KreaDockSubmit({
  disabled,
  loading,
  onClick,
  title = 'Generate',
}: {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled || loading}
      onClick={onClick}
      className="krea-dock-submit"
    >
      {loading ? <span className="krea-dock-submit-spinner" aria-hidden /> : <Plus size={22} strokeWidth={2.5} />}
    </button>
  );
}
