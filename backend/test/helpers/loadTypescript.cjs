const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const ts = require('typescript');

// Exercise the real modules without changing the production build output.
const cache = new Map();
module.exports = function loadTypescript(file) {
    file = path.resolve(file);
    if (!fs.existsSync(file)) {
        const base = file.replace(/\.js$/, '');
        file = [base + '.ts', base + '.tsx'].find(candidate => fs.existsSync(candidate));
    }
    if (!file) throw new Error('TypeScript module not found');
    if (cache.has(file)) return cache.get(file).exports;
    const localRequire = createRequire(file);
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX}
    }).outputText;
    const module = {exports: {}};
    cache.set(file, module);
    new Function('require', 'module', 'exports', compiled)(
        name => name.startsWith('.') ? loadTypescript(path.resolve(path.dirname(file), name)) : localRequire(name),
        module, module.exports
    );
    return module.exports;
};
