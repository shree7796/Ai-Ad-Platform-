import { Image as ImageIcon, Images, Video, Film } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type StudioTab = 'text-to-image' | 'image-to-image' | 'image-to-video' | 'text-to-video';

export interface StudioModeItem {
    id: StudioTab;
    label: string;
    icon: LucideIcon;
    isNew?: boolean;
}

/** Single source of truth — matches the studio TabSwitcher labels and icons. */
export const STUDIO_MODE_ITEMS: StudioModeItem[] = [
    { id: 'text-to-image', label: 'Text to Image', icon: ImageIcon },
    { id: 'image-to-image', label: 'Image to Image', icon: Images },
    { id: 'image-to-video', label: 'Image to Video', icon: Video },
    { id: 'text-to-video', label: 'Text to Video', icon: Film, isNew: true },
];
