export const clampPan = (offset: number, viewport: number, content: number) =>
    Math.min(0, Math.max(viewport - content, offset));

export const clampZoom = (zoom: number) => Math.min(3, Math.max(1, zoom));
