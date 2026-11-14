"use strict"

import * as App from "../core/app.js"
import * as Router from "../core/router.js"
import * as Misc from "../core/misc.js"
import { clampPan, clampZoom, imagePoint } from "./pan.js"
import { extractMaskedRegion, fadeProgress, isZoneComplete, objectColorMatches, objectComponent } from "./objects.js"
import { decrementItemCount, hudIconPositions, isLevelComplete, isLevelId, levelSettings, pickSoundForCount, takeRemainingKind, visibleHudSlot } from "./level.js"
import { congratDelay, loadGameState, saveGameState } from "./progress.js"

export const NS = "App_game";


interface IState {
    id: number
}

let state = <IState>{};
state.id = 42;



const fetchState = () => {
    return Promise.resolve();
}

let activeLevel: string | null = null;
let activeLoad: AbortController | null = null;
let backgroundMusic: HTMLAudioElement | null = null;
let victoryClip: HTMLAudioElement | null = null;
let pickClip: HTMLAudioElement | null = null;
let levelBackgroundAudio: string | null = null;
let levelVictoryAudio: string | null = null;
let levelPickAudio: string | null = null;
let levelPickLastAudio: string | null = null;
let levelSettingsIcons: { music_on: string; music_off: string; sound_on: string; sound_off: string } | null = null;
let musicEnabled = true;
let soundEnabled = true;

const stopBackgroundMusic = () => {
    backgroundMusic?.pause();
    backgroundMusic = null;
};

const stopLevelAudio = () => {
    stopBackgroundMusic();
    victoryClip?.pause();
    victoryClip = null;
    pickClip?.pause();
    pickClip = null;
};

const playBackgroundMusic = (filename: string, signal: AbortSignal) => {
    stopBackgroundMusic();
    const audio = backgroundMusic = new Audio(`assets/audio/${filename}`);
    audio.loop = true;
    const start = () => {
        if (!musicEnabled || signal.aborted || backgroundMusic !== audio) return;
        audio.play().catch(() => {
            if (musicEnabled && !signal.aborted) window.addEventListener("pointerdown", start, { once: true, signal });
        });
    };
    start();
};

const playPickSound = (filename: string, signal: AbortSignal) => {
    pickClip?.pause();
    const audio = pickClip = new Audio(`assets/audio/${filename}`);
    const start = () => {
        if (!soundEnabled || signal.aborted || pickClip !== audio) return;
        audio.play().catch(() => {
            if (soundEnabled && !signal.aborted) window.addEventListener("pointerdown", start, { once: true, signal });
        });
    };
    start();
};

const playVictoryClip = (filename: string, signal: AbortSignal) => {
    const audio = victoryClip = new Audio(`assets/audio/${filename}`);
    const start = () => {
        if (!musicEnabled || signal.aborted || victoryClip !== audio) return;
        audio.play()
            .then(() => {
                if (!signal.aborted && victoryClip === audio) stopBackgroundMusic();
            })
            .catch(() => {
                stopBackgroundMusic();
                if (musicEnabled && !signal.aborted) window.addEventListener("pointerdown", start, { once: true, signal });
            });
    };
    start();
};
let levelHud: { filename: string; width: number; height: number; tlc_y: number; tlc_x: number[] } | null = null;
let levelIcons: { filename: string; width: number; height: number } | null = null;
let levelCongrat: { filename: string; width: number; height: number } | null = null;
let congratVisible = false;
let congratShown = false;
let congratTimer: number | null = null;
let remainingItemCounts: number[] = [];
let hudSlotKinds: (number | null)[] = [];
let hudSlotVisible: boolean[] = [];
let pendingHudKinds: number[] = [];
const HUD_FADE_DURATION = 300;

const loadLevel = (levelId: string) => {
    const canvas = document.querySelector<HTMLCanvasElement>(".game-canvas");
    const context = canvas?.getContext("2d");
    if (!canvas || !context || activeLevel === levelId) return;
    stopLevelAudio();
    if (congratTimer !== null) window.clearTimeout(congratTimer);
    congratTimer = null;
    activeLoad?.abort();
    levelHud = null;
    levelIcons = null;
    levelCongrat = null;
    levelSettingsIcons = null;
    levelBackgroundAudio = null;
    levelVictoryAudio = null;
    levelPickAudio = null;
    levelPickLastAudio = null;
    congratVisible = false;
    congratShown = false;
    remainingItemCounts = [];
    hudSlotKinds = [];
    hudSlotVisible = [];
    pendingHudKinds = [];
    activeLoad = new AbortController();
    const { signal } = activeLoad;
    activeLevel = levelId;

    const image = new Image();
    const colorImage = new Image();
    const objectMask = new Image();
    const zonesMask = new Image();
    const objectCanvas = document.createElement("canvas");
    const zonesCanvas = document.createElement("canvas");
    const colorCanvas = document.createElement("canvas");
    let objectMaskContext: CanvasRenderingContext2D | null = null;
    let objectMaskPixels: Uint8ClampedArray | null = null;
    let zonesMaskPixels: Uint8ClampedArray | null = null;
    let colorPixels: Uint8ClampedArray | null = null;
    let draw = () => {};
    let revealAnimation = 0;
    const revealedObjects: { id: string; canvas: HTMLCanvasElement; x: number; y: number; opacity: number; startedAt: number; duration: number }[] = [];
    const animateRevealedObjects = (now: number) => {
        revealAnimation = 0;
        if (signal.aborted) return;
        let fading = false;
        for (const object of revealedObjects) {
            object.opacity = fadeProgress(now, object.startedAt, object.duration);
            if (object.opacity < 1) fading = true;
        }
        draw();
        if (fading) revealAnimation = requestAnimationFrame(animateRevealedObjects);
    };
    let objectNamesReady = false;
    let objectItems: { id: number; kind: number; zone: string; color: string; bbox: { x1: number; y1: number; x2: number; y2: number } }[] = [];
    let zoneDefinitions: { name: string; color: string; bbox: { x1: number; y1: number; x2: number; y2: number } }[] = [];
    const selectedObjectIds = new Set<number>();
    const selectedPoints = new Map<number, { x: number; y: number }>();
    const completedZones = new Set<string>();
    const pendingSelectionPoints: { x: number; y: number }[] = [];
    const pendingRevealPoints: { x: number; y: number }[] = [];
    const pendingZoneReveals: string[] = [];
    const selectedEntries = () => [...selectedPoints].map(([id, point]) => ({ id, ...point }));
    const checkCompletion = () => {
        if (!levelCongrat || !isLevelComplete(remainingItemCounts) || congratShown || congratTimer !== null) return;
        const saved = loadGameState();
        if (saved?.levelId === levelId && saved.congratShown) {
            congratShown = true;
            return;
        }
        const now = Date.now();
        const previousCompletion = saved?.levelId === levelId ? saved.completedAt : undefined;
        const completedAt = previousCompletion !== undefined && previousCompletion <= now ? previousCompletion : now;
        if (previousCompletion !== completedAt) saveGameState(levelId, selectedEntries(), { completedAt });
        congratTimer = window.setTimeout(() => {
            congratTimer = null;
            if (signal.aborted || activeLevel !== levelId) return;
            const latest = loadGameState();
            if (latest?.levelId === levelId && latest.congratShown) {
                congratShown = true;
                return;
            }
            saveGameState(levelId, latest?.levelId === levelId ? latest.selections : selectedEntries(), { congratShown: true });
            congratShown = true;
            congratVisible = true;
            if (levelVictoryAudio && musicEnabled) playVictoryClip(levelVictoryAudio, signal);
            else stopBackgroundMusic();
            App.render();
        }, congratDelay(completedAt, now));
    };
    const addRevealedImage = (id: string, pixels: Uint8ClampedArray, width: number, height: number, x: number, y: number, duration = 150) => {
        if (revealedObjects.some(object => object.id === id)) return;
        const layer = document.createElement("canvas");
        layer.width = width;
        layer.height = height;
        const layerContext = layer.getContext("2d");
        if (!layerContext) return;
        const imageData = new ImageData(width, height);
        imageData.data.set(pixels);
        layerContext.putImageData(imageData, 0, 0);
        revealedObjects.push({ id, canvas: layer, x, y, opacity: 0, startedAt: performance.now(), duration });
        if (!revealAnimation) revealAnimation = requestAnimationFrame(animateRevealedObjects);
    };
    const revealZone = (name: string) => {
        if (signal.aborted) return;
        if (!objectNamesReady || !zonesMaskPixels || !colorPixels) {
            pendingZoneReveals.push(name);
            return;
        }
        const zone = zoneDefinitions.find(zone => zone.name === name);
        if (!zone || zonesMask.naturalWidth !== colorImage.naturalWidth || zonesMask.naturalHeight !== colorImage.naturalHeight) return;
        const extracted = extractMaskedRegion(colorPixels, zonesMaskPixels, zonesMask.naturalWidth, zonesMask.naturalHeight, zone.color, zone.bbox);
        if (extracted) addRevealedImage(`zone:${name}`, extracted.pixels, extracted.width, extracted.height, extracted.x, extracted.y, 750);
    };
    const processPendingZoneReveals = () => {
        if (!objectNamesReady || !zonesMaskPixels || !colorPixels) return;
        for (const name of pendingZoneReveals) revealZone(name);
        pendingZoneReveals.length = 0;
    };
    const itemAt = (point: { x: number; y: number }) => {
        if (!objectMaskContext || point.x < 0 || point.y < 0 || point.x >= objectMask.naturalWidth || point.y >= objectMask.naturalHeight) return;
        const pixel = objectMaskContext.getImageData(point.x, point.y, 1, 1).data;
        return objectItems.find(item => point.x >= item.bbox.x1 && point.x <= item.bbox.x2 && point.y >= item.bbox.y1 && point.y <= item.bbox.y2 && objectColorMatches(pixel, item.color));
    };
    const selectObjectAt = (point: { x: number; y: number }) => {
        const item = itemAt(point);
        const slotIndex = item ? visibleHudSlot(item.kind, hudSlotKinds, hudSlotVisible) : -1;
        if (!item || selectedObjectIds.has(item.id) || slotIndex === -1) return;
        selectedObjectIds.add(item.id);
        selectedPoints.set(item.id, point);
        saveGameState(levelId, [...selectedPoints].map(([id, selectedPoint]) => ({ id, ...selectedPoint })));
        const count = decrementItemCount(remainingItemCounts, item.kind);
        const pickAudio = pickSoundForCount(count, levelPickAudio, levelPickLastAudio);
        if (pickAudio) playPickSound(pickAudio, signal);
        if (slotIndex !== -1) {
            if (count === 0) {
                hudSlotVisible[slotIndex] = false;
                App.render();
                setTimeout(() => {
                    if (signal.aborted) return;
                    hudSlotKinds[slotIndex] = takeRemainingKind(pendingHudKinds, remainingItemCounts);
                    App.render();
                    if (hudSlotKinds[slotIndex] !== null) requestAnimationFrame(() => {
                        if (signal.aborted) return;
                        hudSlotVisible[slotIndex] = true;
                        App.render();
                    });
                }, HUD_FADE_DURATION);
            } else App.render();
        }
        if (item.zone && !completedZones.has(item.zone) && isZoneComplete(objectItems, selectedObjectIds, item.zone)) {
            completedZones.add(item.zone);
            revealZone(item.zone);
        }
        if (isLevelComplete(remainingItemCounts)) {
            checkCompletion();
            App.render();
        }
    };
    const processPendingSelections = () => {
        if (!objectMaskPixels || !objectNamesReady) return;
        for (const point of pendingSelectionPoints) selectObjectAt(point);
        pendingSelectionPoints.length = 0;
    };
    const markSelectedObject = (point: { x: number; y: number }) => {
        if (!objectMaskPixels || !objectNamesReady) pendingSelectionPoints.push(point);
        else selectObjectAt(point);
    };
    const revealObjectAt = (point: { x: number; y: number }) => {
        if (signal.aborted || !objectMaskPixels || !colorPixels || !objectNamesReady) return;
        const item = itemAt(point);
        if (!item || !selectedObjectIds.has(item.id)) return;
        const width = objectMask.naturalWidth;
        const component = objectComponent(objectMaskPixels, width, objectMask.naturalHeight, point.x, point.y);
        if (!component || width !== colorImage.naturalWidth || objectMask.naturalHeight !== colorImage.naturalHeight || revealedObjects.some(object => object.id === `object:${component.id}`)) return;
        const cropWidth = component.x2 - component.x1 + 1;
        const cropHeight = component.y2 - component.y1 + 1;
        const extracted = new ImageData(cropWidth, cropHeight);
        for (const index of component.pixels) {
            const x = index % width;
            const y = Math.floor(index / width);
            const source = index * 4;
            const target = ((y - component.y1) * cropWidth + x - component.x1) * 4;
            extracted.data.set(colorPixels.subarray(source, source + 4), target);
            extracted.data[target + 3] = Math.round(extracted.data[target + 3] * objectMaskPixels[source + 3] / 255);
        }
        addRevealedImage(`object:${component.id}`, extracted.data, cropWidth, cropHeight, component.x1, component.y1);
    };
    const processPendingReveals = () => {
        if (!objectMaskPixels || !colorPixels || !objectNamesReady) return;
        for (const point of pendingRevealPoints) revealObjectAt(point);
        pendingRevealPoints.length = 0;
    };
    const revealSelectedObject = (point: { x: number; y: number }) => {
        if (!objectMaskPixels || !colorPixels) pendingRevealPoints.push(point);
        else revealObjectAt(point);
    };
    objectMask.onload = () => {
        objectCanvas.width = objectMask.naturalWidth;
        objectCanvas.height = objectMask.naturalHeight;
        objectMaskContext = objectCanvas.getContext("2d");
        objectMaskContext?.drawImage(objectMask, 0, 0);
        objectMaskPixels = objectMaskContext?.getImageData(0, 0, objectCanvas.width, objectCanvas.height).data ?? null;
        processPendingSelections();
        processPendingReveals();
    };
    zonesMask.onload = () => {
        zonesCanvas.width = zonesMask.naturalWidth;
        zonesCanvas.height = zonesMask.naturalHeight;
        const zonesContext = zonesCanvas.getContext("2d");
        if (!zonesContext) return;
        zonesContext.drawImage(zonesMask, 0, 0);
        zonesMaskPixels = zonesContext.getImageData(0, 0, zonesCanvas.width, zonesCanvas.height).data;
        processPendingZoneReveals();
    };
    objectMask.src = `assets/images/${levelId}-objects.png`;
    zonesMask.src = `assets/images/${levelId}-zones.png`;
    colorImage.onload = () => {
        colorCanvas.width = colorImage.naturalWidth;
        colorCanvas.height = colorImage.naturalHeight;
        const colorContext = colorCanvas.getContext("2d");
        if (!colorContext) return;
        colorContext.drawImage(colorImage, 0, 0);
        colorPixels = colorContext.getImageData(0, 0, colorCanvas.width, colorCanvas.height).data;
        processPendingReveals();
        processPendingZoneReveals();
    };
    colorImage.src = `assets/images/${levelId}-color.png`;

    let viewportWidth = 0;
    let viewportHeight = 0;
    let imageWidth = 0;
    let imageHeight = 0;
    let panX = 0;
    let panY = 0;
    let zoom = 1;
    let maxZoom = 10;
    let imageSmoothingEnabled = true;
    let positioned = false;
    let dragging = false;
    let pointerX = 0;
    let pointerY = 0;
    let clickStart: { id: number; x: number; y: number } | null = null;
    let startPanX = 0;
    let startPanY = 0;
    let pinchStartDistance = 0;
    let pinchStartZoom = 1;
    let pinchStartCenterX = 0;
    let pinchStartCenterY = 0;
    let pinchStartPanX = 0;
    let pinchStartPanY = 0;
    const pointers = new Map<number, { x: number; y: number }>();

    draw = () => {
        const bounds = canvas.getBoundingClientRect();
        viewportWidth = bounds.width;
        viewportHeight = bounds.height;
        if (signal.aborted || !viewportWidth || !viewportHeight || !image.naturalWidth) return;

        const pixelRatio = window.devicePixelRatio || 1;
        const pixelWidth = Math.round(viewportWidth * pixelRatio);
        const pixelHeight = Math.round(viewportHeight * pixelRatio);
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }

        const scale = Math.max(viewportWidth / image.naturalWidth, viewportHeight / image.naturalHeight) * zoom;
        imageWidth = image.naturalWidth * scale;
        imageHeight = image.naturalHeight * scale;
        if (!positioned) {
            panX = (viewportWidth - imageWidth) / 2;
            panY = (viewportHeight - imageHeight) / 2;
            positioned = true;
        }
        panX = clampPan(panX, viewportWidth, imageWidth);
        panY = clampPan(panY, viewportHeight, imageHeight);

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, viewportWidth, viewportHeight);
        context.imageSmoothingEnabled = imageSmoothingEnabled;
        context.globalCompositeOperation = "source-over";
        for (const object of revealedObjects) {
            context.globalAlpha = object.opacity;
            context.drawImage(object.canvas, panX + object.x * scale, panY + object.y * scale, object.canvas.width * scale, object.canvas.height * scale);
        }
        context.globalAlpha = 1;
        context.globalCompositeOperation = "multiply";
        context.drawImage(image, panX, panY, imageWidth, imageHeight);
        context.globalCompositeOperation = "source-over";
    };

    window.fetch(`assets/data/${levelId}.json`)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load object data: ${response.status}`);
            return response.json();
        })
        .then((level: { objects: { name: string; color: string; items: { zone: string; bbox: { x1: number; y1: number; x2: number; y2: number } }[] }[]; zones: { name: string; color: string; bbox: { x1: number; y1: number; x2: number; y2: number } }[]; imageSmoothingEnabled?: unknown; maxZoom?: unknown; hud?: { filename: string; width: number; height: number; tlc_y: number; tlc_x: number[] }; icons?: { filename: string; width: number; height: number }; congrat?: { filename: string; width: number; height: number }; audio?: { background?: string; victory?: string; pick?: string; pick_last?: string }; settings?: { music_on: string; music_off: string; sound_on: string; sound_off: string } }) => {
            if (signal.aborted) return;
            levelHud = level.hud ?? null;
            levelIcons = level.icons ?? null;
            levelCongrat = level.congrat ?? null;
            levelSettingsIcons = level.settings ?? null;
            levelBackgroundAudio = level.audio?.background ?? null;
            levelVictoryAudio = level.audio?.victory ?? null;
            levelPickAudio = level.audio?.pick ?? null;
            levelPickLastAudio = level.audio?.pick_last ?? null;
            if (levelBackgroundAudio && musicEnabled) playBackgroundMusic(levelBackgroundAudio, signal);
            remainingItemCounts = level.objects.map(object => object.items.length);
            let itemId = 0;
            objectItems = level.objects.flatMap((object, kind) => object.items.map(item => ({ id: itemId++, kind, zone: item.zone, color: object.color, bbox: item.bbox })));
            zoneDefinitions = level.zones;
            const saved = loadGameState();
            if (saved?.levelId === levelId) {
                congratShown = saved.congratShown === true;
                for (const selection of saved.selections) {
                    const item = objectItems.find(item => item.id === selection.id);
                    if (!item || selectedObjectIds.has(item.id)) continue;
                    selectedObjectIds.add(item.id);
                    selectedPoints.set(item.id, { x: selection.x, y: selection.y });
                    decrementItemCount(remainingItemCounts, item.kind);
                    pendingRevealPoints.push({ x: selection.x, y: selection.y });
                }
                for (const zone of zoneDefinitions) {
                    if (isZoneComplete(objectItems, selectedObjectIds, zone.name)) {
                        completedZones.add(zone.name);
                        pendingZoneReveals.push(zone.name);
                    }
                }
            }
            pendingHudKinds = level.objects.map((_, kind) => kind);
            hudSlotKinds = (level.hud?.tlc_x ?? []).slice(0, 4).map(() => takeRemainingKind(pendingHudKinds, remainingItemCounts));
            hudSlotVisible = hudSlotKinds.map(() => true);
            ({ imageSmoothingEnabled, maxZoom } = levelSettings(level));
            zoom = clampZoom(zoom, maxZoom);
            objectNamesReady = true;
            processPendingSelections();
            checkCompletion();
            processPendingReveals();
            processPendingZoneReveals();
            draw();
            App.render();
        })
        .catch(error => {
            console.error(error);
            objectNamesReady = true;
            processPendingSelections();
        });

    const zoomAt = (nextZoom: number, x: number, y: number) => {
        const updatedZoom = clampZoom(nextZoom, maxZoom);
        if (updatedZoom === zoom) return;
        const ratio = updatedZoom / zoom;
        panX = x - (x - panX) * ratio;
        panY = y - (y - panY) * ratio;
        zoom = updatedZoom;
        draw();
    };

    canvas.addEventListener("wheel", event => {
        event.preventDefault();
        const bounds = canvas.getBoundingClientRect();
        zoomAt(zoom * Math.exp(-event.deltaY * 0.001), event.clientX - bounds.left, event.clientY - bounds.top);
    }, { passive: false, signal });
    canvas.addEventListener("pointerdown", event => {
        if (!positioned || pointers.size >= 2 || (event.pointerType === "mouse" && event.button !== 0)) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        canvas.setPointerCapture(event.pointerId);
        if (pointers.size === 1) {
            dragging = true;
            pointerX = event.clientX;
            pointerY = event.clientY;
            clickStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
            startPanX = panX;
            startPanY = panY;
        } else if (pointers.size === 2) {
            clickStart = null;
            dragging = false;
            const [first, second] = [...pointers.values()];
            pinchStartDistance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
            pinchStartCenterX = (first.x + second.x) / 2 - canvas.getBoundingClientRect().left;
            pinchStartCenterY = (first.y + second.y) / 2 - canvas.getBoundingClientRect().top;
            pinchStartZoom = zoom;
            pinchStartPanX = panX;
            pinchStartPanY = panY;
        }
        canvas.classList.add("is-dragging");
    }, { signal });
    canvas.addEventListener("pointermove", event => {
        const pointer = pointers.get(event.pointerId);
        if (!pointer) return;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        if (clickStart?.id === event.pointerId && Math.hypot(event.clientX - clickStart.x, event.clientY - clickStart.y) > 5) clickStart = null;

        if (pointers.size >= 2) {
            const [first, second] = [...pointers.values()];
            const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
            const nextZoom = clampZoom(pinchStartZoom * distance / pinchStartDistance, maxZoom);
            const ratio = nextZoom / pinchStartZoom;
            const bounds = canvas.getBoundingClientRect();
            const centerX = (first.x + second.x) / 2 - bounds.left;
            const centerY = (first.y + second.y) / 2 - bounds.top;
            panX = centerX - (pinchStartCenterX - pinchStartPanX) * ratio;
            panY = centerY - (pinchStartCenterY - pinchStartPanY) * ratio;
            zoom = nextZoom;
            draw();
        } else if (dragging) {
            panX = clampPan(startPanX + event.clientX - pointerX, viewportWidth, imageWidth);
            panY = clampPan(startPanY + event.clientY - pointerY, viewportHeight, imageHeight);
            draw();
        }
    }, { signal });
    const endPan = (event: PointerEvent, isClick: boolean) => {
        if (isClick && clickStart?.id === event.pointerId) {
            const bounds = canvas.getBoundingClientRect();
            const scale = imageWidth / image.naturalWidth;
            const point = imagePoint(event.clientX - bounds.left, event.clientY - bounds.top, panX, panY, scale, image.naturalWidth, image.naturalHeight);
            if (point) {
                markSelectedObject(point);
                revealSelectedObject(point);
            }
        }
        if (clickStart?.id === event.pointerId) clickStart = null;
        pointers.delete(event.pointerId);
        dragging = false;
        if (pointers.size === 1) {
            const remaining = pointers.values().next().value!;
            pointerX = remaining.x;
            pointerY = remaining.y;
            startPanX = panX;
            startPanY = panY;
            dragging = true;
        }
        if (pointers.size === 0) canvas.classList.remove("is-dragging");
    };
    canvas.addEventListener("pointerup", event => endPan(event, true), { signal });
    canvas.addEventListener("pointercancel", event => endPan(event, false), { signal });
    window.addEventListener("resize", draw, { signal });

    image.onload = draw;
    image.src = `assets/images/${levelId}-bw.png`;
}

export const leave = () => {
    stopLevelAudio();
    if (congratTimer !== null) window.clearTimeout(congratTimer);
    congratTimer = null;
    congratVisible = false;
    activeLoad?.abort();
    activeLoad = null;
    activeLevel = null;
    const canvas = document.querySelector<HTMLCanvasElement>(".game-canvas");
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
};

export const fetch = (params?: string[]) => {
    const levelId = params?.[0];
    if (!levelId || !isLevelId(levelId)) return;
    loadLevel(levelId);
    App.prepareRender(NS, "On joue!");
    Router.registerDirtyExit(null);
    fetchState()
        .then(App.render)
        .catch(App.render)
};



export const render = () => {
    if (!App.inContext(NS)) return "";
    const hud = levelHud;
    const icons = levelIcons;
    const iconMarkup = hud && icons ? hudIconPositions(hud, icons.width, hudSlotKinds, remainingItemCounts).map((icon, index) => {
        const background = icon.kind === null ? "none" : `url('assets/images/${icons.filename}')`;
        const count = icon.kind === null ? "" : `<span class="level-hud-count">${icon.count}</span>`;
        return `<div id="hud-slot-${index}" class="level-hud-icon" style="left:${icon.x}px;top:${icon.y}px;width:${icons.width}px;height:${icons.height}px;background-image:${background};background-position:-${icon.spriteX}px 0;opacity:${icon.kind !== null && hudSlotVisible[index] ? 1 : 0}">${count}</div>`;
    }).join("") : "";
    const congratMarkup = levelCongrat && congratVisible
        ? `<button class="congrat-hud" type="button" style="width:${levelCongrat.width}px;height:${levelCongrat.height}px" aria-label="Fermer les félicitations" onclick="${NS}.dismissCongrat()"><img src="assets/images/${levelCongrat.filename}" alt=""></button>`
        : "";
    const settings = levelSettingsIcons;
    const settingsMarkup = settings ? `<div class="hud-settings">
        <button type="button" aria-label="${musicEnabled ? "Couper la musique" : "Activer la musique"}" onclick="${NS}.toggleMusic()"><img src="assets/images/${musicEnabled ? settings.music_on : settings.music_off}" alt=""></button>
        <button type="button" aria-label="${soundEnabled ? "Couper les effets sonores" : "Activer les effets sonores"}" onclick="${NS}.toggleSound()"><img src="assets/images/${soundEnabled ? settings.sound_on : settings.sound_off}" alt=""></button>
    </div>` : "";

    return `
    ${settingsMarkup}
    <div class="menu-hud"><button type="button" aria-label="Retour au menu" onclick="${NS}.menu()"><img src="assets/images/home.png" alt=""></button></div>
    ${congratMarkup}
    ${hud ? `<div class="level-hud" style="width:${hud.width}px;height:${hud.height}px"><img src="assets/images/${hud.filename}" alt="">${iconMarkup}</div>` : ""}
`;
}

export const postRender = () => {
    if (!App.inContext(NS)) return "";
}



export const menu = () => Router.goto("#/");

export const toggleMusic = () => {
    musicEnabled = !musicEnabled;
    if (musicEnabled && activeLoad && levelBackgroundAudio && !isLevelComplete(remainingItemCounts))
        playBackgroundMusic(levelBackgroundAudio, activeLoad.signal);
    else {
        stopBackgroundMusic();
        if (!musicEnabled) {
            victoryClip?.pause();
            victoryClip = null;
        }
    }
    App.render();
};

export const toggleSound = () => {
    soundEnabled = !soundEnabled;
    if (!soundEnabled) {
        pickClip?.pause();
        pickClip = null;
    }
    App.render();
};

export const dismissCongrat = () => {
    congratVisible = false;
    App.render();
};

export const play = () => {
    if (activeLevel) Router.goto(`#/game/${activeLevel}`)
}
