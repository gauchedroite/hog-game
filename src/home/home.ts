"use strict"

import * as App from "../core/app.js"
import * as Router from "../core/router.js"
import * as Misc from "../core/misc.js"
import { clearGameState, loadGameState } from "./progress.js"

export const NS = "App_home";

let titleHighlightTimer: number | null = null;

const fetchState = () => {
    return Promise.resolve();
}

export const fetch = () => {
    App.prepareRender(NS, "Bienvenue!");
    Router.registerDirtyExit(null);
    fetchState()
        .then(App.render)
        .catch(App.render)
};



export const render = () => {
    if (!App.inContext(NS)) return "";

    const hasGameState = loadGameState() !== null;
    return `
    <div class="home-panel">
        <h1 class="home-title">Cherche les<br>objets<br>cachés</h1>
        <button onclick="${NS}.play()">${hasGameState ? "Continuer" : "Jouer"}</button>
        ${hasGameState ? `<button onclick="${NS}.restart()">Nouvelle partie</button>` : ""}
    </div>
`;
}

const highlightRandomTitleLetter = () => {
    if (!App.inContext(NS)) return;

    const title = document.querySelector<HTMLElement>(".home-title");
    if (!title) return;

    const letters: { node: Text; offset: number }[] = [];
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        for (let offset = 0; offset < node.length; offset++) {
            if (/\S/.test(node.data[offset])) letters.push({ node, offset });
        }
    }
    if (!letters.length) return;

    const { node, offset } = letters[Math.floor(Math.random() * letters.length)];
    const range = document.createRange();
    range.setStart(node, offset);
    range.setEnd(node, offset + 1);
    const letter = document.createElement("span");
    letter.style.color = ["orange", "azure", "bisque", "cornsilk"][Math.floor(Math.random() * 4)];
    range.surroundContents(letter);
    titleHighlightTimer = window.setTimeout(() => {
        letter.replaceWith(document.createTextNode(letter.textContent ?? ""));
        // Schedule the next flash 1–3 seconds after this one began.
        titleHighlightTimer = window.setTimeout(highlightRandomTitleLetter, 250 + Math.random() * 2000);
    }, 250);
};

export const postRender = () => {
    if (titleHighlightTimer !== null) window.clearTimeout(titleHighlightTimer);
    titleHighlightTimer = null;
    if (App.inContext(NS)) highlightRandomTitleLetter();
}



export const play = () => {
    Router.goto(`#/game/${loadGameState()?.levelId ?? "level-01"}`)
}

export const restart = () => {
    clearGameState();
    Router.goto("#/game/level-01");
}
