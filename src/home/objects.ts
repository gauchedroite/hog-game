const colorsMatch = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) =>
    Math.abs(r1 - r2) <= 2 && Math.abs(g1 - g2) <= 2 && Math.abs(b1 - b2) <= 2;

export const objectColorMatches = (pixel: Uint8ClampedArray, color: string, offset = 0) =>
    colorsMatch(pixel[offset], pixel[offset + 1], pixel[offset + 2], parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16));

export const objectNameFromPixel = (pixel: Uint8ClampedArray, names: Map<string, string>) => {
    for (const [color, name] of names) if (objectColorMatches(pixel, color)) return name;
};

export const fadeProgress = (now: number, startedAt: number, duration: number) => Math.min(1, Math.max(0, (now - startedAt) / duration));

export const isZoneComplete = (items: { id: number; zone: string }[], selected: Set<number>, zone: string) => {
    const zoneItems = items.filter(item => item.zone === zone);
    return zoneItems.length > 0 && zoneItems.every(item => selected.has(item.id));
};

export const extractMaskedRegion = (source: Uint8ClampedArray, mask: Uint8ClampedArray, width: number, height: number, color: string, bbox: { x1: number; y1: number; x2: number; y2: number }) => {
    const x1 = Math.max(0, bbox.x1);
    const y1 = Math.max(0, bbox.y1);
    const x2 = Math.min(width - 1, bbox.x2);
    const y2 = Math.min(height - 1, bbox.y2);
    if (x2 < x1 || y2 < y1 || source.length < width * height * 4 || mask.length < width * height * 4) return null;

    const cropWidth = x2 - x1 + 1;
    const cropHeight = y2 - y1 + 1;
    const pixels = new Uint8ClampedArray(cropWidth * cropHeight * 4);
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    let found = false;
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            const from = (y * width + x) * 4;
            if (!mask[from + 3] || !colorsMatch(mask[from], mask[from + 1], mask[from + 2], r, g, b)) continue;
            const to = ((y - y1) * cropWidth + x - x1) * 4;
            pixels.set(source.subarray(from, from + 4), to);
            pixels[to + 3] = Math.round(pixels[to + 3] * mask[from + 3] / 255);
            found = true;
        }
    }
    return found ? { pixels, width: cropWidth, height: cropHeight, x: x1, y: y1 } : null;
};

export const objectComponent = (pixels: Uint8ClampedArray, width: number, height: number, x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    const start = y * width + x;
    const startOffset = start * 4;
    if (!pixels[startOffset + 3]) return null;

    const [r, g, b] = pixels.subarray(startOffset, startOffset + 3);
    const visited = new Uint8Array(width * height);
    const component = [start];
    visited[start] = 1;
    let id = start;
    let x1 = x;
    let y1 = y;
    let x2 = x;
    let y2 = y;
    for (let i = 0; i < component.length; i++) {
        const index = component[i];
        const px = index % width;
        const py = Math.floor(index / width);
        id = Math.min(id, index);
        const add = (next: number) => {
            if (visited[next]) return;
            visited[next] = 1;
            const offset = next * 4;
            if (pixels[offset + 3] && colorsMatch(pixels[offset], pixels[offset + 1], pixels[offset + 2], r, g, b)) component.push(next);
        };
        if (px > 0) add(index - 1);
        if (px + 1 < width) add(index + 1);
        if (py > 0) add(index - width);
        if (py + 1 < height) add(index + width);
        x1 = Math.min(x1, px);
        y1 = Math.min(y1, py);
        x2 = Math.max(x2, px);
        y2 = Math.max(y2, py);
    }
    return { id, pixels: component, x1, y1, x2, y2 };
};
