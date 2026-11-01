"use strict"

import * as App from "./core/app.js"
import * as router from "./core/router.js"
import * as Layout from "./layout.js"
//
import * as HomeMain from "./home/main.js"


// Global references to application modules. Used for event handlers.
(window as any)[App.NS] = App;



export const startup = async () => {

    await App.initialize(Layout.render, Layout.postRender, "Jeu d'objets cachés");


    HomeMain.startup();


    // Routing table


    router.gotoCurrent();
}
