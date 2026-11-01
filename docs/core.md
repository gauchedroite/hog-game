# Core files

The files in `src/core` provide shared browser-side features. They handle page rendering, navigation, browser forms, and common data formatting. The current game uses the router and renderer. It does not use most helpers in `misc.ts`.

## `src/core/app.ts`

This file holds app-wide state and browser services.

### Start and render pages

- `initialize(render, postRender, appName)` stores the app's render callbacks and name. It also creates shared app state.
- `render()` calls the main render callback. It updates `#app-root` with `morphdom`, then runs the page post-render callback. It also updates the browser title and body ID.
- `renderPartial(id, markup)` updates one element by ID instead of the whole app root.
- `renderOnNextTick()` schedules a full render after the current browser task.
- `pauseRender(paused)` blocks or allows renders.
- `setHardRender()` makes the next full render replace `#app-root` instead of updating its child elements.
- `transitionUI()` and `untransitionUI()` switch the root element's `js-waiting` and `js-fadein` classes.

`render()` needs an element with the ID `app-root` and the global `window.morphdom` function. The current `index.html` loads `lib/morphdom-umd.js` before the app module.

### Set page context and title

- `prepareRender(namespace, title)` starts the waiting transition, and sets the page context and title when you provide them.
- `inContext(namespace)` returns whether the current page context matches a string or one of the strings in an array.
- `setPageTitle(title)` sets the page title. The app name is added after ` || `.
- `NS` is the string `App`. The project uses it to expose app functions on `window` for HTML event handlers.

A page uses its own namespace, such as `App_home`. Its `render()` function can return an empty string outside that context.

### Store app state and errors

- `state` is shared state for the app. `initialize()` resets it, and `setUID()` and `getUID()` write and read its `uid` field.
- `setError(text)`, `getErrorMessages()`, `clearErrors()`, `hasError()`, `hasErrorStatus(status)`, and `hasNoError()` manage the app's error state.
- `serverError()` checks for status 500. `fatalError()` checks for status 403 or -404. The full renderer adds matching CSS classes to `#app-root`.
- `uiServerVersion` stores the `ui-version` response header. `uiUpdateRequired()` compares it with `APP.uiClientVersion`.

### Send API requests

`GET`, `POST`, `PUT`, `DELETE`, `HEAD`, `UPLOAD`, and `DOWNLOAD` send requests to the API. The first four parse JSON responses. `DOWNLOAD` returns a file blob. Requests include credentials and retry some network failures.

- `apiurl(path)` joins `APP.root`, the `api` path, and the supplied path.
- `url(resource)` joins a domain from `APP.root` with a resource path.
- `download(path, filename, event)` downloads a file after stopping the event's default action.
- `view(path, filename, event)` opens a downloaded file in a new tab.
- `loadScript(src)` adds a script element to the document and returns a promise.

The API helpers expect a global `APP` object before the app module loads. Some error and URL paths also call `APP.root.bump()` and `APP.root.getDomain()`. The current `index.html` sets `APP.root` to a string, so adapt that value before using those paths.

### Save page state

- `getPageState(namespace, key, defaultValue)` reads a value from `localStorage`.
- `setPageState(namespace, key, value)` writes a value to `localStorage` and returns it.

The helpers use different local-storage keys: `getPageState()` reads `fms20-pages-state:${uid}`, but `setPageState()` writes `roideqc-pages-state:${uid}`. Values written by `setPageState()` will not be returned by `getPageState()` unless the keys are aligned.

## `src/core/misc.ts`

This file contains small helpers for HTML, forms, data, dates, numbers, and messages. Import only the helpers that a page needs.

### HTML and JSON

- `escapeHTML(text, forAttribute)` escapes characters that have meaning in HTML. The default also escapes quotes for attribute values.
- `sanitizeAttribute(title)` replaces quote marks with backticks.
- `convertToPlainText(html)` extracts text from an HTML string.
- `reviver` turns matching date and time strings into `Date` objects when parsing JSON.
- `replacer` serializes `Date` values as JSON date strings.

`app.ts` uses `reviver` and `replacer` for API responses and requests.

### Copy and compare data

- `clone(state, passthrough)` makes a copy of an object, including nested objects, arrays, and dates. Keys in `passthrough` keep their original values.
- `same(state1, state2, onlyprops)` compares object values. It ignores keys that start with `_` and supports an optional list of keys to compare.
- `changes(state1, state2)` returns a translated list of changed fields, or `null` when it finds none. It uses the global `i18n` function.
- `createWhite(formState, props)` copies only the named properties.
- `createBlack(formState, props)` copies the object and removes the named properties.

### Read and validate form fields

- `html5Valid(namespace)`, `html5HasInvalids(namespace)`, and `html5Invalid(id)` work with browser form validation and the `js-invalid` class.
- `fromInputText(id, defaultValue)`, `fromInputNumber(id, defaultValue)`, and `fromInputDate(id, defaultValue)` read values from input elements.
- `fromInputCheckbox(id, defaultValue)`, `fromInputCheckboxMask(name, defaultValue)`, and `fromInputCheckboxList(name, list)` read checkbox values.
- `fromSelectText(id, defaultValue)`, `fromSelectNumber(id, defaultValue)`, and `fromSelectBoolean(id, defaultValue)` read a selected value.
- `toInputText(value)` and the date and time `toInput...` functions format values for input fields.

When an element is missing, the read helpers return the supplied default value. Many also return `null` for an empty field.

### Format and validate values

- `toStaticText`, `toStaticTextarea`, `toStaticTextNA`, `toStaticNumber`, `toStaticNumberNA`, and `toStaticNumberNZ` format values for display.
- `toStaticNumberDecimal`, `toStaticNumberDecimalNZ`, `toStaticMoney`, and `toStaticCheckboxYesNo` format numbers, money, and checkbox values.
- `toInputDate`, `formatYYYYMMDD`, `formatHHMMSS24`, `toInputTimeHHMM`, `toInputTimeHHMMSS`, `toInputDateTime_hhmm24`, `toInputDateTime_hhmmss24`, `toInputDateTime_hhmmssNA`, `toStaticDateTime`, and `toLocaleDate` format dates and times.
- `parseDateText`, `isValidDateString`, `isValidTimeString`, `dateInRange`, and `elapsedTime` parse, validate, compare, or calculate date and time values.
- `formatBytes`, `getSize`, `filesizeText`, and `formatLocaleNumber` format sizes and numbers.
- `isValidCreditCard(cardnumber, cardname)` checks Visa, Fleet, and MasterCard numbers using the rules defined for each type.
- `parseInputId(namespace, inputId)` splits a namespaced input ID into a field name and number.
- `formatTitle(name, summary)` uses `summary.title` when present. Otherwise, it returns `New ${name}`.

### Show messages

- `toastSuccess(text)`, `toastSuccessSave()`, and `toastSuccessUpload(filename)` show success messages.
- `toastFailure(text, duration)` shows an error message.

Toast helpers need the global `Toastify` library. `toastSuccessSave()`, `toastSuccessUpload()`, and `changes()` also need the global `i18n` function.

## `src/core/router.ts`

This file handles hash navigation. A hash route is the part of a browser URL after `#`, such as `#/about`.

- `addRoute(pattern, callback)` registers a route. The pattern is a regular expression string. A captured section becomes an array of callback parameters, split at `/`.
- `goto(path, delay)` changes the hash and runs the matching route. An empty path or `/` means `#/`.
- `gotoCurrent(delay)` runs the route for the current hash. The router also runs on page load and on hash changes.
- `registerDirtyExit(callback)` sets a function that can stop navigation when the current page has unsaved changes. Pass `null` to clear it.
- `goBackOrResume(isDirty)` resumes a stopped navigation when the page is dirty. Otherwise, it goes back in browser history.
- `registerHashChanged(callback)` registers a function that runs when a matching route is handled.
- `doBeforeCallback(callback)` registers an async function that runs before each route callback.
- `reload()` clears the dirty-exit function and reloads the page.

Register routes before calling `gotoCurrent()`. The router checks routes in registration order and uses the first matching pattern.

## Create a small app

The current project shows the pieces working together in `src/main.ts`, `src/layout.ts`, and `src/home/main.ts`. Use the same flow for a new page.

1. Add an element with `id="app-root"` to the HTML page. Define the global `APP` object before loading the app module. Load `morphdom` before the app renders.
2. In the entry module, call `App.initialize()` with the layout render functions and app name.
3. Register page routes, then call `router.gotoCurrent()` to handle the current URL.
4. In a page route callback, call `App.prepareRender()` and then call `App.render()` after the page data is ready.
5. Return page HTML from the page's `render()` function. Use `App.inContext()` to return content only for that page.

A minimal entry module looks like this:

```ts
import * as App from "./core/app.js";
import * as router from "./core/router.js";
import * as Page from "./page.js";
import * as Layout from "./layout.js";

export const startup = async () => {
  await App.initialize(Layout.render, Layout.postRender, "My app");
  Page.startup();
  router.gotoCurrent();
};
```

The page module registers one route and provides its content:

```ts
import * as App from "./core/app.js";
import * as router from "./core/router.js";

export const NS = "App_home";

export const startup = () => router.addRoute("^#/?$", fetch);

export const fetch = () => {
  App.prepareRender(NS, "Home");
  App.render();
};

export const render = () => App.inContext(NS)
  ? "<main><h1>Hello</h1></main>"
  : "";

export const postRender = () => {};
```

The layout returns the page HTML and calls its post-render function:

```ts
import * as Page from "./page.js";

export const render = () => Page.render();
export const postRender = () => Page.postRender();
```

If a page loads data asynchronously, call `App.render()` when the request completes. A page can use `App.GET()` or `App.POST()` for API requests, then render the result.

TypeScript source imports use `.js` extensions in this project. The compiler writes browser modules to `dist`. The browser entry module `src/index.ts` calls the app startup function.
