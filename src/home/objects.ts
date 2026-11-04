const colorsMatch = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) =>
    Math.abs(r1 - r2) <= 2 && Math.abs(g1 - g2) <= 2 && Math.abs(b1 - b2) <= 2;

export const objectNameFromPixel = (pixel: Uint8ClampedArray, names: Map<string, string>) => {
    for (const [color, name] of names) {
        if (colorsMatch(pixel[0], pixel[1], pixel[2], parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16))) return name;
    }
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
    let x1 = x;
    let y1 = y;
    let x2 = x;
    let y2 = y;
    for (let i = 0; i < component.length; i++) {
        const index = component[i];
        const px = index % width;
        const py = Math.floor(index / width);
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
    return { pixels: component, x1, y1, x2, y2 };
};
