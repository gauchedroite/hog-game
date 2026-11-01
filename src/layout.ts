"use strict"

import * as App from "./core/app.js"
import * as HomeMain from "./home/main.js"



export const render = () => {
    return `
    ${HomeMain.render()}
`
}

export const postRender = () => {
    HomeMain.postRender();
}
