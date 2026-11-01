"use strict"

import * as App from "../core/app.js"
import * as Router from "../core/router.js"
import * as Misc from "../core/misc.js"

export const NS = "App_home";


interface IState {
    id: number
    cheval: string
}

let state = <IState>{};
state.id = 42;
state.cheval = "Non, je ne suis pas un cheval!";

let key = "bocalimo";



const fetchState = () => {
    return Promise.resolve();
}

export const fetch = () => {
    App.prepareRender(NS, "HOME");
    Router.registerDirtyExit(null);
    fetchState()
        .then(App.render)
        .catch(App.render)
};



export const render = () => {
    if (!App.inContext(NS)) return "";

    return `
    <button onclick="${NS}._getstate()">GET STATE</button>
    <button onclick="${NS}._savestate()">SAVE STATE</button>
`;
}

export const postRender = () => {
    if (!App.inContext(NS)) return "";
}



export const _getstate = () => {
    App.GET(`/state/${key}`)
        .then(App.render)
        .catch(App.render);
}
export const _savestate = () => {
    App.POST(`/state/${key}`, state)
        .then(App.render)
        .catch(App.render);
}
