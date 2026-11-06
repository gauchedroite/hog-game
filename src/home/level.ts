export const isLevelId = (levelId: string) => /^level-[a-z0-9-]+$/.test(levelId);

export const levelSettings = (settings: { imageSmoothingEnabled?: unknown; maxZoom?: unknown }) => ({
    imageSmoothingEnabled: typeof settings.imageSmoothingEnabled === "boolean" ? settings.imageSmoothingEnabled : true,
    maxZoom: typeof settings.maxZoom === "number" && Number.isFinite(settings.maxZoom) && settings.maxZoom >= 1 ? settings.maxZoom : 10,
});

export const hudIconPositions = (hud: { tlc_x: number[]; tlc_y: number }, iconWidth: number, slotKinds: (number | null)[], itemCounts: number[]) =>
    hud.tlc_x.slice(0, 4).map((x, index) => {
        const kind = slotKinds[index] ?? null;
        return { x, y: hud.tlc_y, kind, spriteX: kind === null ? 0 : kind * iconWidth, count: kind === null ? 0 : itemCounts[kind] ?? 0 };
    });

export const takeRemainingKind = (pendingKinds: number[], itemCounts: number[]) => {
    for (let i = pendingKinds.length - 1; i >= 0; i--) {
        if (itemCounts[pendingKinds[i]] <= 0) pendingKinds.splice(i, 1);
    }
    if (!pendingKinds.length) return null;
    return pendingKinds.splice(Math.floor(Math.random() * pendingKinds.length), 1)[0]!;
};

export const decrementItemCount = (itemCounts: number[], kind: number) => {
    itemCounts[kind] = Math.max(0, itemCounts[kind] - 1);
    return itemCounts[kind];
};
