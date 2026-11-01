"use strict"

import * as router from "../core/router.js"
import * as home from "./home.js"


(window as any)[home.NS] = home;



export const startup = () => {
    router.addRoute("^#/?$", home.fetch);
}

export const render = () => {
    return `
<div>
    ${home.render()}
</div>
`
}

export const postRender = () => {
    home.postRender();
}
