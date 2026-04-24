/**
 * Procedural “AI / cinematic” look without stock-photo CDNs- SVG data-URIs only.
 */

/** Full-bleed poster frames for `<video poster>` (works as data: URL in browsers). */
export function gradientPoster(hueA: number, hueB: number): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hueA} 48% 16%)"/><stop offset="100%" stop-color="hsl(${hueB} 42% 10%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Small thumbs for studio slider- distinct hues per slot. */
export function studioThumbDataUri(slot: number): string {
    const hues = [268, 198, 328, 158];
    const h = hues[slot % hues.length];
    const h2 = (h + 38) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${h} 52% 26%)"/><stop offset="100%" stop-color="hsl(${h2} 44% 14%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="78%" cy="22%" r="18%" fill="hsla(${h} 60% 50% / 0.12)"/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
