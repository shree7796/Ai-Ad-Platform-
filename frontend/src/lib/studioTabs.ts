import { Image as ImageIcon, Images, Video, Film } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type StudioTab = 'text-to-image' | 'image-to-image' | 'image-to-video' | 'text-to-video';

export interface StudioModeItem {
    id: StudioTab;
    label: string;
    icon: LucideIcon;
    /** Rounded tile behind the tool icon in the sidebar (Krea-style). */
    sidebarTileBg: string;
    isNew?: boolean;
}

/** Single source of truth — matches the studio TabSwitcher labels and icons. */
export const STUDIO_MODE_ITEMS: StudioModeItem[] = [
    { id: 'text-to-image', label: 'Text to Image', icon: ImageIcon, sidebarTileBg: '#2563eb' },
    { id: 'image-to-image', label: 'Image to Image', icon: Images, sidebarTileBg: '#7c3aed' },
    { id: 'image-to-video', label: 'Image to Video', icon: Video, sidebarTileBg: '#ea580c' },
    { id: 'text-to-video', label: 'Text to Video', icon: Film, sidebarTileBg: '#0891b2', isNew: true },
];
