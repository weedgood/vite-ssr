"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printServerInfo = exports.createSsrServer = exports.createSSRDevHandler = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const perf_hooks_1 = require("perf_hooks");
const vite_1 = require("vite");
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("../config");
// This cannot be imported from utils due to ESM <> CJS issues
const isRedirect = ({ status = 0 } = {}) => status >= 300 && status < 400;
function fixEntryPoint(vite) {
    // The plugin is redirecting to the entry-client for the SPA,
    // but we need to reach the entry-server here. This trick
    // replaces the plugin behavior in the config and seems
    // to keep the entry-client for the SPA.
    for (const alias of vite.config.resolve.alias || []) {
        // @ts-ignore
        if (alias._viteSSR === true) {
            alias.replacement = alias.replacement.replace('client', 'server');
        }
    }
}
const createSSRDevHandler = (server, options = {}) => {
    options = {
        ...server.config.inlineConfig,
        ...options,
    };
    const pluginOptions = config_1.getPluginOptions(server.config);
    const resolve = (p) => path_1.default.resolve(server.config.root, p);
    async function getIndexTemplate(url) {
        // Template should be fresh in every request
        const indexHtml = await fs_1.promises.readFile(pluginOptions.input || resolve('index.html'), 'utf-8');
        return await server.transformIndexHtml(url, indexHtml);
    }
    function writeHead(response, params = {}) {
        if (params.status) {
            response.statusCode = params.status;
        }
        if (params.statusText) {
            response.statusMessage = params.statusText;
        }
        if (params.headers) {
            for (const [key, value] of Object.entries(params.headers)) {
                response.setHeader(key, value);
            }
        }
    }
    const handleSsrRequest = async (request, response, next) => {
        if (request.method !== 'GET' || request.originalUrl === '/favicon.ico') {
            return next();
        }
        fixEntryPoint(server);
        let template;
        try {
            template = await getIndexTemplate(request.originalUrl);
        }
        catch (error) {
            server.ssrFixStacktrace(error);
            return next(error);
        }
        try {
            const entryPoint = options.ssr || (await config_1.getEntryPoint(server.config, template));
            let resolvedEntryPoint = await server.ssrLoadModule(resolve(entryPoint));
            resolvedEntryPoint = resolvedEntryPoint.default || resolvedEntryPoint;
            const render = resolvedEntryPoint.render || resolvedEntryPoint;
            const protocol = 
            // @ts-ignore
            request.protocol ||
                (request.headers.referer || '').split(':')[0] ||
                'http';
            const url = protocol + '://' + request.headers.host + request.originalUrl;
            // This context might contain initialState provided by other plugins
            const context = (options.getRenderContext &&
                (await options.getRenderContext({
                    url,
                    request,
                    response,
                    resolvedEntryPoint,
                }))) ||
                {};
            // This is used by Vitedge
            writeHead(response, context);
            if (isRedirect(context)) {
                return response.end();
            }
            const result = await render(url, {
                request,
                response,
                template,
                ...context,
            });
            writeHead(response, result);
            if (isRedirect(result)) {
                return response.end();
            }
            response.setHeader('Content-Type', 'text/html');
            response.end(result.html);
        }
        catch (error) {
            // Send back template HTML to inject ViteErrorOverlay
            response.setHeader('Content-Type', 'text/html');
            response.end(template);
            // Wait until browser injects ViteErrorOverlay
            // custom element from the previous template
            setTimeout(() => next(error), 250);
            server.ssrFixStacktrace(error);
        }
    };
    return handleSsrRequest;
};
exports.createSSRDevHandler = createSSRDevHandler;
async function createSsrServer(options = {}) {
    var _a;
    // Enable SSR in the plugin
    process.env.__DEV_MODE_SSR = 'true';
    const viteServer = await vite_1.createServer({
        ...options,
        server: options.server || { ...options },
    });
    if (options.polyfills !== false) {
        if (!globalThis.fetch) {
            const fetch = await Promise.resolve().then(() => __importStar(require('node-fetch')));
            // @ts-ignore
            globalThis.fetch = fetch.default || fetch;
        }
    }
    const isMiddlewareMode = 
    // @ts-ignore
    (options === null || options === void 0 ? void 0 : options.middlewareMode) || ((_a = options === null || options === void 0 ? void 0 : options.server) === null || _a === void 0 ? void 0 : _a.middlewareMode);
    return new Proxy(viteServer, {
        get(target, prop, receiver) {
            if (prop === 'listen') {
                return async (port) => {
                    const server = await target.listen(port);
                    if (!isMiddlewareMode) {
                        printServerInfo(server);
                    }
                    return server;
                };
            }
            return Reflect.get(target, prop, receiver);
        },
    });
}
exports.createSsrServer = createSsrServer;
function printServerInfo(server) {
    const info = server.config.logger.info;
    let ssrReadyMessage = '\n -- SSR mode';
    if (Object.prototype.hasOwnProperty.call(server, 'printUrls')) {
        info(chalk_1.default.cyan(`\n  vite v${require('vite/package.json').version}`) +
            chalk_1.default.green(` dev server running at:\n`), { clear: !server.config.logger.hasWarned });
        // @ts-ignore
        server.printUrls();
        // @ts-ignore
        if (globalThis.__ssr_start_time) {
            ssrReadyMessage += chalk_1.default.cyan(` ready in ${Math.round(
            // @ts-ignore
            perf_hooks_1.performance.now() - globalThis.__ssr_start_time)}ms.`);
        }
    }
    info(ssrReadyMessage + '\n');
}
exports.printServerInfo = printServerInfo;
