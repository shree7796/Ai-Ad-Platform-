'use client';

import type { LucideIcon } from 'lucide-react';
import {
    ArrowRightLeft,
    AudioLines,
    Banana,
    Bot,
    Clapperboard,
    Film,
    Gauge,
    Layers,
    Moon,
    Palette,
    Sparkles,
    Type,
    Wand2,
    Waves,
} from 'lucide-react';

const DEFAULT: LucideIcon = Sparkles;

/** Lucide icon per backend `model` / registry value — extend when new models ship. */
const BY_VALUE: Record<string, LucideIcon> = {
    'flux-schnell': Gauge,
    'flux-dev': Sparkles,
    'flux-pro': Sparkles,
    'flux-2-pro': Wand2,
    'flux-kontext': Layers,
    'flux-2-pro-edit': Wand2,
    'nano-banana': Banana,
    'nano-banana-2': Banana,
    'nano-banana-pro': Banana,
    'seedream-45': Palette,
    'seedream-45-edit': Palette,
    'ideogram-v3': Type,
    kling_standard: Clapperboard,
    kling_pro: Clapperboard,
    kling_21_pro: Clapperboard,
    kling_21_master: Clapperboard,
    kling_26_pro: Clapperboard,
    kling_30_pro: Clapperboard,
    pixverse_v6: Film,
    pixverse_c1: Film,
    pixverse_c1_transition: ArrowRightLeft,
    seedance_standard: AudioLines,
    seedance_fast: AudioLines,
    seedance_ref: AudioLines,
    seedance_fast_ref: AudioLines,
    luma: Moon,
    wan: Waves,
    minimax: Bot,
};

export function StudioModelIcon({
    modelValue,
    size = 16,
    strokeWidth = 2,
    color,
    className,
}: {
    modelValue: string;
    size?: number;
    strokeWidth?: number;
    color?: string;
    className?: string;
}) {
    const Icon = BY_VALUE[modelValue] ?? DEFAULT;
    return (
        <Icon
            size={size}
            strokeWidth={strokeWidth}
            color={color}
            className={className}
            aria-hidden
            style={{ flexShrink: 0 }}
        />
    );
}
