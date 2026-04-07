/**
 * Side grids: **e‑commerce + kids & toys** stills (Unsplash), 12 + 8 unique URLs — no Picsum repeats.
 */
const q = 'auto=format&fit=crop&q=85&w=640';

const u = (id: string) => `https://images.unsplash.com/${id}?${q}`;

/** Twenty curated stills: toy retail, plush, blocks, kids products, checkout, packaging, general catalog. */
const ECOMMERCE_KIDS_POOL: readonly string[] = [
    u('photo-1566576912321-d58ddd7a6088'),
    u('photo-1515488042361-ee00e0ddd4e4'),
    u('photo-1503454537195-1dcabb73ffb9'),
    u('photo-1606800052052-a08af7148866'),
    u('photo-1516627145497-ae6968895b74'),
    u('photo-1556742049-0cfed4f6a45d'),
    u('photo-1607082348824-0a96f2a4b9da'),
    u('photo-1578662996442-48f60103fc96'),
    u('photo-1586495777744-4413f21062fa'),
    u('photo-1596870230751-ebdfce98ec42'),
    u('photo-1558618666-fcd25c85cd64'),
    u('photo-1595950653106-6c9ebd614d3a'),
    u('photo-1523275335684-37898b6baf30'),
    u('photo-1505740420928-5e560c06d30e'),
    u('photo-1612817288484-6f916006741a'),
    u('photo-1584917865442-de89df76afd3'),
    u('photo-1572635196237-14b3f281503f'),
    u('photo-1472851294608-062f824d29cc'),
    u('photo-1460925895917-afdab827c52f'),
    u('photo-1445205170230-053b83016050'),
];

export const DARK_SHOWCASE_GRID_LEFT: readonly string[] = ECOMMERCE_KIDS_POOL.slice(0, 12);
export const DARK_SHOWCASE_GRID_RIGHT: readonly string[] = ECOMMERCE_KIDS_POOL.slice(12, 20);

export const DARK_SHOWCASE_GRID_20: readonly string[] = [...DARK_SHOWCASE_GRID_LEFT, ...DARK_SHOWCASE_GRID_RIGHT];
