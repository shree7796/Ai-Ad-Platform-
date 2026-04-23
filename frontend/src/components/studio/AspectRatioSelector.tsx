'use client';

import type { CSSProperties } from 'react';

export const STUDIO_ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16'] as const;
export type StudioAspectRatio = (typeof STUDIO_ASPECT_RATIOS)[number];

function parseRatio(label: string): { w: number; h: number } {
  const [a, b] = label.split(':').map(Number);
  if (!a || !b) return { w: 1, h: 1 };
  return { w: a, h: b };
}

/** Mini wireframe whose outer box reflects the aspect ratio (Krea-style skeleton). */
function RatioFrame({ ratio, active }: { ratio: string; active: boolean }) {
  const { w, h } = parseRatio(ratio);
  const max = 44;
  let fw: number;
  let fh: number;
  if (w >= h) {
    fw = max;
    fh = Math.max(18, Math.round((max * h) / w));
  } else {
    fh = max;
    fw = Math.max(18, Math.round((max * w) / h));
  }
  const border = active ? '2px solid rgba(255,255,255,0.95)' : '1px solid rgba(255,255,255,0.22)';
  const bg = active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)';
  return (
    <div
      style={{
        width: max + 8,
        height: max + 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        border,
        background: bg,
        boxSizing: 'border-box',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div
        style={{
          width: fw,
          height: fh,
          borderRadius: 6,
          border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
}

const labelStyle = (active: boolean): CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.02em',
  color: active ? '#ffffff' : 'rgba(255,255,255,0.5)',
  marginTop: 8,
  textAlign: 'center',
});

interface AspectRatioSelectorProps {
  value: string;
  onChange: (ratio: string) => void;
  /** Extra class for the grid wrapper. */
  className?: string;
}

/**
 * Two-column grid of aspect ratio cards with centered ratio label (studio dock).
 */
export default function AspectRatioSelector({ value, onChange, className }: AspectRatioSelectorProps) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 10,
        width: '100%',
      }}
    >
      {STUDIO_ASPECT_RATIOS.map((r) => {
        const active = value === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 10px 14px',
              borderRadius: 14,
              border: active ? '2px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.1)',
              background: active ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <RatioFrame ratio={r} active={active} />
            <span style={labelStyle(active)}>{r}</span>
          </button>
        );
      })}
    </div>
  );
}
