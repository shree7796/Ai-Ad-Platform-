import { Wand2, Paintbrush, Clapperboard, MonitorPlay, Boxes, Film, Gamepad2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type StudioTab =
    | 'text-to-image'
    | 'image-to-image'
    | 'image-to-video'
    | 'text-to-video'
    | 'image-to-3d'
    | 'text-to-story'
    | 'igaming-assets';

/** Group key for sidebar subsection dividers. */
export type StudioTabGroup = 'image' | 'video' | '3d';

export interface StudioModeItem {
    id: StudioTab;
    label: string;
    /** One-line description shown under the label in the sidebar. */
    description: string;
    icon: LucideIcon;
    /** Gradient for the rounded tile in the sidebar (Krea-style). */
    sidebarTileBg: string;
    group: StudioTabGroup;
    isNew?: boolean;
    /** When true, free-plan users see a lock in the sidebar; generation is blocked until they subscribe. */
    requiresPaidPlan?: boolean;
}

/** Single source of truth- matches the studio TabSwitcher labels and icons. */
export const STUDIO_MODE_ITEMS: StudioModeItem[] = [
    {
        id: 'text-to-image',
        label: 'Text to Image',
        description: 'Generate from a prompt',
        icon: Wand2,
        sidebarTileBg: 'linear-gradient(145deg,#1e60d5,#0a84ff)',
        group: 'image',
    },
    {
        id: 'image-to-image',
        label: 'Image Edit',
        description: 'Restyle or redraw a photo',
        icon: Paintbrush,
        sidebarTileBg: 'linear-gradient(145deg,#5b21b6,#7c3aed)',
        group: 'image',
    },
    {
        id: 'image-to-video',
        label: 'Animate',
        description: 'Bring a photo to life',
        icon: Clapperboard,
        sidebarTileBg: 'linear-gradient(145deg,#b45309,#ea580c)',
        group: 'video',
        requiresPaidPlan: true,
    },
    {
        id: 'text-to-video',
        label: 'Text to Video',
        description: 'Describe a scene, get a clip',
        icon: MonitorPlay,
        sidebarTileBg: 'linear-gradient(145deg,#065f7c,#0891b2)',
        group: 'video',
        isNew: true,
        requiresPaidPlan: true,
    },
    {
        id: 'image-to-3d',
        label: 'Image to 3D',
        description: 'Turn a photo into a mesh',
        icon: Boxes,
        sidebarTileBg: 'linear-gradient(145deg,#6b21a8,#9333ea)',
        group: '3d',
        isNew: true,
        requiresPaidPlan: true,
    },
    {
        id: 'text-to-story',
        label: 'Story Studio',
        description: 'Script → narrated YouTube video',
        icon: Film,
        sidebarTileBg: 'linear-gradient(145deg,#7c2d12,#dc2626)',
        group: 'video',
        isNew: true,
        requiresPaidPlan: true,
    },
    {
        id: 'igaming-assets',
        label: 'iGaming Assets',
        description: 'Slot icons · promos · multi-angle',
        icon: Gamepad2,
        sidebarTileBg: 'linear-gradient(145deg,#064e3b,#059669)',
        group: 'image',
        isNew: true,
        requiresPaidPlan: true,
    },
];

/** Group metadata used to render subsection dividers in the sidebar. */
export const STUDIO_TAB_GROUPS: Record<StudioTabGroup, { label: string }> = {
    image: { label: 'Images' },
    video: { label: 'Video' },
    '3d': { label: '3D' },
};
