import React from 'react';
import ssrPrepass from 'react-ssr-prepass';
import { renderToString } from 'react-dom/server.js';
import { StaticRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { getFullPath, withoutSuffix } from '../utils/route';
import { createRouter } from './utils';
import coreViteSSR from '../core/entry-server.js';
import { provideContext } from './components.js';
export { ClientOnly, useContext } from './components.js';
let render = renderToString;
// @ts-ignore
if (__USE_APOLLO_RENDERER__) {
    // Apollo does not support Suspense so it needs its own
    // renderer in order to await for async queries.
    // @ts-ignore
    import('@apollo/client/react/ssr')
        .then(({ renderToStringWithData }) => {
        render = renderToStringWithData;
    })
        .catch(() => null);
}
const viteSSR = function (App, { routes, base, prepassVisitor, PropsProvider, pageProps, styleCollector, ...options }, hook) {
    return coreViteSSR(options, async (ctx, { isRedirect, ...extra }) => {
        const context = ctx;
        context.router = createRouter({
            routes,
            base,
            initialState: extra.initialState || null,
            pagePropsOptions: pageProps,
            PropsProvider,
        });
        if (hook) {
            context.initialState = (await hook(context)) || context.initialState;
        }
        if (isRedirect())
            return {};
        const routeBase = base && withoutSuffix(base(context), '/');
        const fullPath = getFullPath(context.url, routeBase);
        const helmetContext = {};
        let app = React.createElement(HelmetProvider, { context: helmetContext }, React.createElement(StaticRouter, { basename: routeBase, location: fullPath }, provideContext(React.createElement(App, context), context)));
        const styles = styleCollector && (await styleCollector(context));
        if (styles) {
            app = styles.collect(app);
        }
        await ssrPrepass(app, prepassVisitor);
        const body = await render(app);
        if (isRedirect()) {
            styles && styles.cleanup && styles.cleanup();
            return {};
        }
        const currentRoute = context.router.getCurrentRoute();
        if (currentRoute) {
            Object.assign(context.initialState || {}, (currentRoute.meta || {}).state || {});
        }
        const { htmlAttributes: htmlAttrs = '', bodyAttributes: bodyAttrs = '', ...tags } = helmetContext.helmet || {};
        const styleTags = (styles && styles.toString(body)) || '';
        styles && styles.cleanup && styles.cleanup();
        const headTags = Object.keys(tags)
            .map((key) => (tags[key] || '').toString())
            .join('') +
            '\n' +
            styleTags;
        return { body, headTags, htmlAttrs, bodyAttrs };
    });
};
export default viteSSR;
