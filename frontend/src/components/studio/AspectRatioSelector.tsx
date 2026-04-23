'use client';

import type { CSSProperties } from 'react';

export const STUDIO_ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16'] as const;
export type StudioAspectRatio = (typeof STUDIO_ASPECT_RATIOS)[number];

function parseRatio(label: string): { w: number; h: number } {
  const [a, b] = label.split(':').map(Number);
  if (!a || !b) return { w: 1, h: 1 };
  return { w: a, h: b };
}

/** Compact wireframe; outer box reflects the aspect ratio. */
function RatioFrame({ ratio, active }: { ratio: string; active: boolean }) {
  const { w, h } = parseRatio(ratio);
  const max = 20;
  let fw: number;
  let fh: number;
  if (w >= h) {
    fw = max;
    fh = Math.max(10, Math.round((max * h) / w));
  } else {
    fh = max;
    fw = Math.max(10, Math.round((max * w) / h));
  }
  const border = active ? '2px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.18)';
  const bg = active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)';
  const pad = 3;
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md box-border transition-[border-color,background] duration-150"
      style={{
        width: max + pad * 2,
        height: max + pad * 2,
        border,
        background: bg,
      }}
    >
      <div
        className="rounded-sm box-border"
        style={{
          width: fw,
          height: fh,
          border: active ? '1px solid rgba(255,255,255,0.32)' : '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(0,0,0,0.22)',
        }}
      />
    </div>
  );
}

interface AspectRatioSelectorProps {
  value: string;
  onChange: (ratio: string) => void;
  /** Extra class for the wrapper (e.g. spacing). */
  className?: string;
}

const labelStyle = (active: boolean): CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  color: active ? '#ffffff' : 'rgba(255,255,255,0.48)',
  lineHeight: 1,
  whiteSpace: 'nowrap',
});

/**
 * Compact aspect ratio chips (icon + label inline). Used in Text-to-Image and Image-to-Image docks.
 */
export default function AspectRatioSelector({ value, onChange, className }: AspectRatioSelectorProps) {
  return (
    <div
      className={`flex flex-wrap gap-1.5 w-full ${className ?? ''}`}
      role="group"
      aria-label="Aspect ratio"
    >
      {STUDIO_ASPECT_RATIOS.map((r) => {
        const active = value === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            aria-pressed={active}
            style={{ fontFamily: 'inherit' }}
            className={
              'inline-flex min-h-0 items-center gap-2 rounded-[10px] border cursor-pointer ' +
              'transition-[border-color,background-color] duration-150 py-1 pl-1 pr-2.5 ' +
              (active
                ? 'border-white/90 bg-white/[0.07]'
                : 'border-white/[0.10] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.04]')
            }
          >
            <RatioFrame ratio={r} active={active} />
            <span style={labelStyle(active)}>{r}</span>
          </button>
        );
      })}
    </div>
  );
}
