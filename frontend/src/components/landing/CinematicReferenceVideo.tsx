'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';

type Props = {
    /** Tried in order; on failure we advance to the next URL (avoids multi-source error-event quirks). */
    sources: readonly string[] | string[];
    poster?: string;
    className?: string;
    videoClassName?: string;
    /** Optional soft gradient on top of the video (for legibility). */
    gradientClassName?: string;
};

/** Marketing-style video: sequential URL fallback, poster only if every URL fails, autoplay + play() kick. */
export default function CinematicReferenceVideo({
    sources,
    poster,
    className = 'relative h-full w-full',
    videoClassName = 'absolute inset-0 h-full w-full object-cover',
    gradientClassName,
}: Props) {
    const ref = useRef<HTMLVideoElement>(null);
    const list = useMemo(() => [...sources].filter(Boolean), [sources]);
    const [srcIndex, setSrcIndex] = useState(0);

    useEffect(() => {
        setSrcIndex(0);
    }, [sources]);

    const exhausted = list.length > 0 && srcIndex >= list.length;
    const currentSrc = srcIndex < list.length ? list[srcIndex] : undefined;

    const tryPlay = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        el.muted = true;
        el.play().catch(() => {});
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el || !currentSrc) return;
        const onCanPlay = () => tryPlay();
        el.addEventListener('canplay', onCanPlay);
        const onVis = () => tryPlay();
        document.addEventListener('visibilitychange', onVis);
        tryPlay();
        return () => {
            el.removeEventListener('canplay', onCanPlay);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [currentSrc, srcIndex, tryPlay]);

    const onVideoError = useCallback(() => {
        setSrcIndex((i) => (i + 1 < list.length ? i + 1 : list.length));
    }, [list.length]);

    if (exhausted && poster) {
        const dataPoster = poster.startsWith('data:');
        return (
            <div className={['relative', className].join(' ')}>
                {dataPoster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                    <Image src={poster} alt="" fill className="object-cover" sizes="100vw" priority />
                )}
            </div>
        );
    }

    if (!currentSrc) {
        return null;
    }

    return (
        <div className={className}>
            <video
                ref={ref}
                key={currentSrc}
                className={videoClassName}
                src={currentSrc}
                poster={poster}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                controls={false}
                onError={onVideoError}
            />
            {gradientClassName ? (
                <div className={`pointer-events-none absolute inset-0 ${gradientClassName}`} />
            ) : null}
        </div>
    );
}
