"use strict"


interface IRoute {
    url: string
    callback: (params?: string[]) => void
}

let router: IRoute[] = [];

let reverting = false;
let resumeTo: string;
let dirtyExit: (() => boolean) | null;
let onHashChange: (hash: string) => void;
let beforeCallback: () => Promise<void>;




export const reload = () => {
    dirtyExit = null;
    location.reload();
};

export const registerDirtyExit = (dirtyExitFunction: (() => boolean) | null) => {
    dirtyExit = dirtyExitFunction;
};

export const registerHashChanged = (hashChangeFunction: (hash: string) => void) => {
    onHashChange = hashChangeFunction;
};

export const addRoute = (url: string, callback?: (params?: string[]) => void) => {
    router.push(<IRoute>{ url, callback });
};

export const goto = (url: string, delay = 0) => {
    dirtyExit = null;
    if (delay == 0) {
        if (url == "" || url == "/") url = "#/";
        if (window.location.hash != url)
            (<any>document).location = url;
        else
            hashChange();
    }
    else {
        setTimeout(() => { goto(url, 0); }, delay);
    }
};

export const gotoCurrent = (delay = 0) => {
    if (delay == 0)
        hashChange();
    else
        setTimeout(() => { gotoCurrent(0); }, delay);
};

export const goBackOrResume = (isDirty: boolean) => {
    if (isDirty)
        goto(resumeTo);
    else
        history.back();
};

export const doBeforeCallback = (preCallback: () => Promise<void>) => {
    beforeCallback = preCallback;
}

const hashChange = async () => {
    let hash = window.location.hash;
    if (hash.length == 0)
        hash = "#/";

    const route = router.find(one => hash.match(new RegExp(one.url)));
    if (route) {
        if (!reverting) {
            if (dirtyExit != undefined) {
                let warning = dirtyExit();
                if (warning != undefined && warning) {
                    reverting = true;
                    resumeTo = hash;
                    history.back();
                    return;
                }
            }

            if (onHashChange)
                onHashChange(hash);

            if (route.callback) {
                if (beforeCallback)
                    await beforeCallback();

                let parameters = new RegExp(route.url).exec(hash);
                if (!parameters || parameters.length < 2 || parameters[1] == undefined)
                    route.callback([]);
                else
                    route.callback(parameters[1].split("/"));
            }
        }
        reverting = false;
    }
};



window.addEventListener("hashchange", hashChange);
window.addEventListener("DOMContentLoaded", hashChange);
