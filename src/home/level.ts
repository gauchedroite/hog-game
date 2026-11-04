export const isLevelId = (levelId: string) => /^level-[a-z0-9-]+$/.test(levelId);

export const levelSettings = (settings: { imageSmoothingEnabled?: unknown; maxZoom?: unknown }) => ({
    imageSmoothingEnabled: typeof settings.imageSmoothingEnabled === "boolean" ? settings.imageSmoothingEnabled : true,
    maxZoom: typeof settings.maxZoom === "number" && Number.isFinite(settings.maxZoom) && settings.maxZoom >= 1 ? settings.maxZoom : 10,
});
