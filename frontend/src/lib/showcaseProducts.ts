/**
 * Curated Unsplash product shots- varied categories for e‑commerce showcase UI.
 * Params keep files reasonably sized for Next/Image.
 */
const q = 'auto=format&fit=crop&q=85';

export type ShowcaseProduct = {
    id: string;
    src: string;
    label: string;
    category: string;
};

export const SHOWCASE_PRODUCTS: ShowcaseProduct[] = [
    {
        id: 'sneaker',
        src: `https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?${q}&w=900`,
        label: 'Aero Runner',
        category: 'Footwear',
    },
    {
        id: 'watch',
        src: `https://images.unsplash.com/photo-1523275335684-37898b6baf30?${q}&w=900`,
        label: 'Minimal Chrono',
        category: 'Accessories',
    },
    {
        id: 'headphones',
        src: `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?${q}&w=900`,
        label: 'Studio One',
        category: 'Audio',
    },
    {
        id: 'skincare',
        src: `https://images.unsplash.com/photo-1612817288484-6f916006741a?${q}&w=900`,
        label: 'Lumière Serum',
        category: 'Beauty',
    },
    {
        id: 'bag',
        src: `https://images.unsplash.com/photo-1584917865442-de89df76afd3?${q}&w=900`,
        label: 'Carry Day',
        category: 'Leather goods',
    },
    {
        id: 'sunglasses',
        src: `https://images.unsplash.com/photo-1572635196237-14b3f281503f?${q}&w=900`,
        label: 'Solar Frame',
        category: 'Eyewear',
    },
    {
        id: 'plush-pals',
        src: `https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?${q}&w=900`,
        label: 'Plush pals',
        category: 'Kids & toys',
    },
    {
        id: 'brick-lab',
        src: `https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?${q}&w=900`,
        label: 'Brick lab',
        category: 'Learning toys',
    },
    {
        id: 'mini-racer',
        src: `https://images.unsplash.com/photo-1606800052052-a08af7148866?${q}&w=900`,
        label: 'Mini racer',
        category: 'Toy vehicles',
    },
    {
        id: 'tiny-steps',
        src: `https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?${q}&w=900`,
        label: 'Tiny steps',
        category: 'Kids footwear',
    },
];
