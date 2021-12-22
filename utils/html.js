export function findDependencies(modules, manifest) {
    const files = new Set();
    for (const id of modules || []) {
        for (const file of manifest[id] || []) {
            files.add(file);
        }
    }
    return [...files];
}
export function renderPreloadLinks(files) {
    let link = '';
    for (const file of files || []) {
        if (file.endsWith('.js')) {
            link += `<link rel="modulepreload" crossorigin href="${file}">`;
        }
        else if (file.endsWith('.css')) {
            link += `<link rel="stylesheet" href="${file}">`;
        }
    }
    return link;
}
export function buildHtmlDocument(template, parts) {
    return template
        .replace('<html', `<html ${parts.htmlAttrs} `)
        .replace('<body', `<body ${parts.bodyAttrs} `)
        .replace('</head>', `${parts.headTags}\n</head>`)
        .replace(/<div id="app"><\/div>/, `<div id="app" data-server-rendered="true">${parts.body}</div>\n\n  <script>window.__INITIAL_STATE__=${parts.initialState || "'{}'"}</script>`);
}
