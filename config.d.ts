import { ResolvedConfig, InlineConfig } from 'vite';
export interface BuildOptions {
    /**
     * Vite options applied only to the client build
     */
    clientOptions?: InlineConfig;
    /**
     * Vite options applied only to the server build
     */
    serverOptions?: InlineConfig & {
        /**
         * Extra properties to include in the generated server package.json,
         * or 'false' to avoid generating it.
         */
        packageJson?: Record<string, unknown> | false;
    };
}
export interface ViteSsrPluginOptions {
    /**
     * Path to entry index.html
     * @default '<root>/index.html'
     */
    input?: string;
    build?: BuildOptions & {
        /**
         * Keep the index.html generated in the client build
         * @default false
         */
        keepIndexHtml?: boolean;
    };
    excludeSsrComponents?: Array<RegExp>;
    features?: {
        /**
         * Use '@apollo/client' renderer if present
         * @default true
         */
        reactApolloRenderer?: boolean;
    };
}
export declare const INDEX_HTML = "index.html";
export declare function getPluginOptions(viteConfig: ResolvedConfig): ViteSsrPluginOptions;
export declare function resolveViteConfig(mode?: string): Promise<Readonly<Omit<import("vite").UserConfig, "plugins" | "alias" | "dedupe" | "assetsInclude" | "optimizeDeps"> & {
    configFile: string | undefined;
    configFileDependencies: string[];
    inlineConfig: InlineConfig;
    root: string;
    base: string;
    publicDir: string;
    command: "build" | "serve";
    mode: string;
    isProduction: boolean;
    env: Record<string, any>;
    resolve: import("vite").ResolveOptions & {
        alias: import("vite").Alias[];
    };
    plugins: readonly import("vite").Plugin[];
    server: import("vite").ResolvedServerOptions;
    build: Required<Omit<import("vite").BuildOptions, "base" | "cleanCssOptions" | "polyfillDynamicImport" | "brotliSize">>;
    assetsInclude: (file: string) => boolean;
    logger: import("vite").Logger;
    createResolver: (options?: Partial<import("vite").InternalResolveOptions> | undefined) => import("vite").ResolveFn;
    optimizeDeps: Omit<import("vite").DepOptimizationOptions, "keepNames">;
}>>;
export declare function getEntryPoint(config?: ResolvedConfig, indexHtml?: string): Promise<string>;
