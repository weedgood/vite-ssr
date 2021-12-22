import React from 'react';
import ReactDOM from 'react-dom';
import createClientContext from '../core/entry-client.js';
import { BrowserRouter, useHistory } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { withoutSuffix } from '../utils/route';
import { createRouter } from './utils';
import { provideContext } from './components.js';
export { ClientOnly, useContext } from './components.js';
export const viteSSR = async function (App, { routes, base, suspenseFallback, PropsProvider, pageProps, debug = {}, styleCollector, ...options }, hook) {
    const url = window.location;
    const routeBase = base && withoutSuffix(base({ url }), '/');
    const ctx = await createClientContext({
        ...options,
        url,
        spaRedirect: (location) => {
            const { push } = useHistory();
            React.useEffect(() => push(location), [push]);
        },
    });
    const context = ctx;
    context.router = createRouter({
        routes,
        base,
        initialState: context.initialState,
        pagePropsOptions: pageProps,
        PropsProvider,
    });
    if (hook) {
        await hook(context);
    }
    let app = React.createElement(HelmetProvider, {}, React.createElement(BrowserRouter, { basename: routeBase }, React.createElement(React.Suspense, { fallback: suspenseFallback || '' }, provideContext(React.createElement(App, context), context))));
    const styles = styleCollector && (await styleCollector(context));
    if (styles && styles.provide) {
        app = styles.provide(app);
    }
    if (debug.mount !== false) {
        const el = document.getElementById('app');
        styles && styles.cleanup && styles.cleanup();
        // @ts-ignore
        __DEV__ ? ReactDOM.render(app, el) : ReactDOM.hydrate(app, el);
    }
};
export default viteSSR;
