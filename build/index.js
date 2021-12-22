"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const vite_1 = require("vite");
const plugin_replace_1 = __importDefault(require("@rollup/plugin-replace"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
async function generatePackageJson(viteConfig, clientBuildOptions, serverBuildOptions) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    if (serverBuildOptions.packageJson === false)
        return;
    const outputFile = (_c = (_b = (_a = serverBuildOptions.build) === null || _a === void 0 ? void 0 : _a.rollupOptions) === null || _b === void 0 ? void 0 : _b.output) === null || _c === void 0 ? void 0 : _c.file;
    const ssrOutput = path_1.default.parse(outputFile ||
        (((_d = viteConfig.build) === null || _d === void 0 ? void 0 : _d.ssr) || ((_e = serverBuildOptions.build) === null || _e === void 0 ? void 0 : _e.ssr)));
    const moduleFormat = ((_h = (_g = (_f = viteConfig.build) === null || _f === void 0 ? void 0 : _f.rollupOptions) === null || _g === void 0 ? void 0 : _g.output) === null || _h === void 0 ? void 0 : _h.format) ||
        ((_l = (_k = (_j = serverBuildOptions.build) === null || _j === void 0 ? void 0 : _j.rollupOptions) === null || _k === void 0 ? void 0 : _k.output) === null || _l === void 0 ? void 0 : _l.format);
    const packageJson = {
        main: outputFile ? ssrOutput.base : ssrOutput.name + '.js',
        type: /^esm?$/i.test(moduleFormat || '') ? 'module' : 'commonjs',
        ssr: {
            // This can be used later to serve static assets
            assets: (await fs_1.promises.readdir((_m = clientBuildOptions.build) === null || _m === void 0 ? void 0 : _m.outDir)).filter((file) => !/(index\.html|manifest\.json)$/i.test(file)),
        },
        ...(serverBuildOptions.packageJson || {}),
    };
    await fs_1.promises.writeFile(path_1.default.join((_o = serverBuildOptions.build) === null || _o === void 0 ? void 0 : _o.outDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf-8');
}
module.exports = async (inlineBuildOptions = {}) => new Promise(async (resolve) => {
    var _a, _b, _c, _d;
    const viteConfig = await config_1.resolveViteConfig();
    const distDir = (_b = (_a = viteConfig.build) === null || _a === void 0 ? void 0 : _a.outDir) !== null && _b !== void 0 ? _b : path_1.default.resolve(process.cwd(), 'dist');
    const { input: inputFilePath = '', build: pluginBuildOptions = {} } = config_1.getPluginOptions(viteConfig);
    const defaultFilePath = path_1.default.resolve(viteConfig.root, config_1.INDEX_HTML);
    const inputFileName = inputFilePath.split('/').pop() || config_1.INDEX_HTML;
    let indexHtmlTemplate = '';
    const clientBuildOptions = vite_1.mergeConfig({
        build: {
            outDir: path_1.default.resolve(distDir, 'client'),
            ssrManifest: true,
            emptyOutDir: false,
            // Custom input path
            rollupOptions: inputFilePath && inputFilePath !== defaultFilePath
                ? {
                    input: inputFilePath,
                    plugins: [
                        inputFileName !== config_1.INDEX_HTML && {
                            generateBundle(options, bundle) {
                                // Rename custom name to index.html
                                const htmlAsset = bundle[inputFileName];
                                delete bundle[inputFileName];
                                htmlAsset.fileName = config_1.INDEX_HTML;
                                bundle[config_1.INDEX_HTML] = htmlAsset;
                            },
                        },
                    ],
                }
                : {},
        },
    }, vite_1.mergeConfig(pluginBuildOptions.clientOptions || {}, inlineBuildOptions.clientOptions || {}));
    const serverBuildOptions = vite_1.mergeConfig({
        publicDir: false,
        build: {
            outDir: path_1.default.resolve(distDir, 'server'),
            // The plugin is already changing the vite-ssr alias to point to the server-entry.
            // Therefore, here we can just use the same entry point as in the index.html
            ssr: await config_1.getEntryPoint(viteConfig),
            emptyOutDir: false,
            rollupOptions: {
                plugins: [
                    plugin_replace_1.default({
                        preventAssignment: true,
                        values: {
                            __VITE_SSR_HTML__: () => indexHtmlTemplate,
                        },
                    }),
                ],
            },
        },
    }, vite_1.mergeConfig(pluginBuildOptions.serverOptions || {}, inlineBuildOptions.serverOptions || {}));
    const clientResult = await vite_1.build(clientBuildOptions);
    const isWatching = Object.prototype.hasOwnProperty.call(clientResult, '_maxListeners');
    if (isWatching) {
        // This is a build watcher
        const watcher = clientResult;
        let resolved = false;
        // @ts-ignore
        watcher.on('event', async ({ result }) => {
            var _a;
            if (result) {
                // This piece runs everytime there is
                // an updated frontend bundle.
                result.close();
                // Re-read the index.html in case it changed.
                // This content is not included in the virtual bundle.
                indexHtmlTemplate = await fs_1.promises.readFile(((_a = clientBuildOptions.build) === null || _a === void 0 ? void 0 : _a.outDir) + `/${config_1.INDEX_HTML}`, 'utf-8');
                // Build SSR bundle with the new index.html
                await vite_1.build(serverBuildOptions);
                await generatePackageJson(viteConfig, clientBuildOptions, serverBuildOptions);
                if (!resolved) {
                    resolve(null);
                    resolved = true;
                }
            }
        });
    }
    else {
        // This is a normal one-off build
        const clientOutputs = (Array.isArray(clientResult)
            ? clientResult
            : [clientResult]).flatMap((result) => result.output);
        // Get the index.html from the resulting bundle.
        indexHtmlTemplate = (_c = clientOutputs.find((file) => file.type === 'asset' && file.fileName === config_1.INDEX_HTML)) === null || _c === void 0 ? void 0 : _c.source;
        await vite_1.build(serverBuildOptions);
        // index.html file is not used in SSR and might be
        // served by mistake.
        // Let's remove it unless the user overrides this behavior.
        if (!pluginBuildOptions.keepIndexHtml) {
            await fs_1.promises
                .unlink(path_1.default.join((_d = clientBuildOptions.build) === null || _d === void 0 ? void 0 : _d.outDir, 'index.html'))
                .catch(() => null);
        }
        await generatePackageJson(viteConfig, clientBuildOptions, serverBuildOptions);
        resolve(null);
    }
});
