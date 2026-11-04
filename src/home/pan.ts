export const clampPan = (offset: number, viewport: number, content: number) =>
    Math.min(0, Math.max(viewport - content, offset));

export const clampZoom = (zoom: number, maxZoom = 10) => Math.min(maxZoom, Math.max(1, zoom));

export const imagePoint = (x: number, y: number, panX: number, panY: number, scale: number, width: number, height: number) => {
    const point = { x: Math.floor((x - panX) / scale), y: Math.floor((y - panY) / scale) };
    return point.x >= 0 && point.x < width && point.y >= 0 && point.y < height ? point : null;
};
