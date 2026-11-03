"use strict"

import * as App from "../core/app.js"
import * as Router from "../core/router.js"
import * as Misc from "../core/misc.js"
import { clampPan, clampZoom } from "./pan.js"

export const NS = "App_game";


interface IState {
    id: number
}

let state = <IState>{};
state.id = 42;



const fetchState = () => {
    return Promise.resolve();
}

let levelLoaded = false;

const loadLevel = () => {
    const canvas = document.querySelector<HTMLCanvasElement>(".game-canvas");
    const context = canvas?.getContext("2d");
    if (!canvas || !context || levelLoaded) return;
    levelLoaded = true;

    const image = new Image();
    let viewportWidth = 0;
    let viewportHeight = 0;
    let imageWidth = 0;
    let imageHeight = 0;
    let panX = 0;
    let panY = 0;
    let zoom = 1;
    let positioned = false;
    let dragging = false;
    let pointerX = 0;
    let pointerY = 0;
    let startPanX = 0;
    let startPanY = 0;
    let pinchStartDistance = 0;
    let pinchStartZoom = 1;
    let pinchStartCenterX = 0;
    let pinchStartCenterY = 0;
    let pinchStartPanX = 0;
    let pinchStartPanY = 0;
    const pointers = new Map<number, { x: number; y: number }>();

    const draw = () => {
        const bounds = canvas.getBoundingClientRect();
        viewportWidth = bounds.width;
        viewportHeight = bounds.height;
        if (!viewportWidth || !viewportHeight || !image.naturalWidth) return;

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
        context.drawImage(image, panX, panY, imageWidth, imageHeight);
    };

    const zoomAt = (nextZoom: number, x: number, y: number) => {
        const updatedZoom = clampZoom(nextZoom);
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
    }, { passive: false });
    canvas.addEventListener("pointerdown", event => {
        if (!positioned || pointers.size >= 2 || (event.pointerType === "mouse" && event.button !== 0)) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        canvas.setPointerCapture(event.pointerId);
        if (pointers.size === 1) {
            dragging = true;
            pointerX = event.clientX;
            pointerY = event.clientY;
            startPanX = panX;
            startPanY = panY;
        } else if (pointers.size === 2) {
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
    });
    canvas.addEventListener("pointermove", event => {
        const pointer = pointers.get(event.pointerId);
        if (!pointer) return;
        pointer.x = event.clientX;
        pointer.y = event.clientY;

        if (pointers.size >= 2) {
            const [first, second] = [...pointers.values()];
            const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
            const nextZoom = clampZoom(pinchStartZoom * distance / pinchStartDistance);
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
    });
    const endPan = (event: PointerEvent) => {
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
    canvas.addEventListener("pointerup", endPan);
    canvas.addEventListener("pointercancel", endPan);
    window.addEventListener("resize", draw);

    image.onload = draw;
    image.src = "assets/images/level-01.jpg";
}

export const fetch = () => {
    loadLevel();
    App.prepareRender(NS, "On joue!");
    Router.registerDirtyExit(null);
    fetchState()
        .then(App.render)
        .catch(App.render)
};



export const render = () => {
    if (!App.inContext(NS)) return "";

    return `
    <div>On joue!</div>
`;
}

export const postRender = () => {
    if (!App.inContext(NS)) return "";
}



export const play = () => {
    Router.goto(`#/game`)
}
