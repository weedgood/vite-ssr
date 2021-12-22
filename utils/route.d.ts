export declare function withPrefix(string: string, prefix: string): string;
export declare function withoutPrefix(string: string, prefix: string): string;
export declare function withSuffix(string: string, suffix: string): string;
export declare function withoutSuffix(string: string, suffix: string): string;
export declare function createUrl(urlLike: string | URL): URL;
export declare function joinPaths(...paths: string[]): string;
export declare function getFullPath(url: string | URL | Location, routeBase?: string): string;
