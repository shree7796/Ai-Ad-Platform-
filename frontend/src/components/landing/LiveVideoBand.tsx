'use client';

import { useRef, useEffect, useState } from 'react';
import { LOCAL_BAND_CLIP, REMOTE_VIDEO_FALLBACKS } from '@/lib/landingVideoSources';

const BAND_SOURCES = [LOCAL_BAND_CLIP, ...REMOTE_VIDEO_FALLBACKS];

export default function LiveVideoBand() {
    const ref = useRef<HTMLVideoElement>(null);
    const [idx, setIdx] = useState(0);
    const src = BAND_SOURCES[idx];

    useEffect(() => {
        ref.current?.play().catch(() => {});
    }, [src]);

    return (
        <section className="relative w-full overflow-hidden bg-black">
            <div className="relative aspect-[21/9] min-h-[200px] w-full md:min-h-[280px] lg:min-h-[320px]">
                <div className="luma-hero-aurora absolute inset-0 opacity-60" aria-hidden />
                <video
                    ref={ref}
                    key={src}
                    src={src}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="relative z-[1] h-full w-full object-cover"
                    onError={() => setIdx((i) => (i + 1 < BAND_SOURCES.length ? i + 1 : i))}
                />
                {/* Was too heavy- video was invisible */}
                <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-[#030303]/80 via-transparent to-[#030303]/80" />
                <div className="pointer-events-none absolute inset-0 z-[2] bg-black/15" />
            </div>
        </section>
    );
}
