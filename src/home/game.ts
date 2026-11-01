"use strict"

import * as App from "../core/app.js"
import * as Router from "../core/router.js"
import * as Misc from "../core/misc.js"

export const NS = "App_game";


interface IState {
    id: number
}

let state = <IState>{};
state.id = 42;



const fetchState = () => {
    return Promise.resolve();
}

export const fetch = () => {
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
