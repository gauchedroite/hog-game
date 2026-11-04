"use strict"

import * as router from "../core/router.js"
import * as home from "./home.js"
import * as game from "./game.js"


(window as any)[home.NS] = home;
(window as any)[game.NS] = game;



export const startup = () => {
    router.addRoute("^#/?$", home.fetch);
    router.addRoute("^#/game/([^/]+)$", game.fetch);
}

export const render = () => {
    return `
<div>
    ${home.render()}
    ${game.render()}
</div>
`
}

export const postRender = () => {
    home.postRender();
}
