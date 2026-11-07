import { isLevelId } from "./level.js"

const STORAGE_KEY = "hog-game-state";

export interface ISelection {
    id: number
    x: number
    y: number
}

export interface IGameState {
    levelId: string
    selections: ISelection[]
    completedAt?: number
    congratShown?: boolean
}

export const parseGameState = (value: string | null): IGameState | null => {
    if (!value) return null;
    try {
        const state = JSON.parse(value);
        if (!isLevelId(state?.levelId) || !Array.isArray(state.selections)) return null;
        const selections = state.selections.filter((selection: ISelection) =>
            Number.isSafeInteger(selection?.id) && selection.id >= 0 &&
            Number.isSafeInteger(selection.x) && selection.x >= 0 &&
            Number.isSafeInteger(selection.y) && selection.y >= 0);
        if (!selections.length) return null;
        const completedAt = Number.isSafeInteger(state.completedAt) && state.completedAt >= 0 ? state.completedAt : undefined;
        return {
            levelId: state.levelId,
            selections,
            ...(completedAt === undefined ? {} : { completedAt }),
            ...(state.congratShown === true ? { congratShown: true } : {}),
        };
    } catch {
        return null;
    }
};

export const loadGameState = () => {
    try {
        return parseGameState(localStorage.getItem(STORAGE_KEY));
    } catch {
        return null;
    }
};

export const clearGameState = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Local storage can be disabled.
    }
};

export const congratDelay = (completedAt: number, now: number) => Math.min(2000, Math.max(0, 2000 - (now - completedAt)));

export const saveGameState = (levelId: string, selections: ISelection[], metadata: Pick<IGameState, "completedAt" | "congratShown"> = {}) => {
    const previous = loadGameState();
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ...(previous?.levelId === levelId ? previous : {}),
            ...metadata,
            levelId,
            selections,
        }));
    } catch {
        // Local storage can be disabled or full.
    }
};
