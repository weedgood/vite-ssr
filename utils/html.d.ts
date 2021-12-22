export declare function findDependencies(modules: string[], manifest: Record<string, string[]>): string[];
export declare function renderPreloadLinks(files: string[]): string;
export declare function buildHtmlDocument(template: string, parts: {
    htmlAttrs?: string;
    bodyAttrs?: string;
    headTags?: string;
    body?: string;
    initialState?: string;
}): string;
