"use strict"

import * as App from "../core/app.js"
import * as Router from "../core/router.js"
import * as Misc from "../core/misc.js"
import { clearGameState, loadGameState } from "./progress.js"

export const NS = "App_home";


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
    <div>Le jeu!</div>
    <button onclick="${NS}.play()">${hasGameState ? "Continuer" : "Jouer"}</button>
    ${hasGameState ? `<button onclick="${NS}.restart()">Nouvelle partie</button>` : ""}
`;
}

export const postRender = () => {
    if (!App.inContext(NS)) return "";
}



export const play = () => {
    Router.goto(`#/game/${loadGameState()?.levelId ?? "level-01"}`)
}

export const restart = () => {
    clearGameState();
    Router.goto("#/game/level-01");
}
