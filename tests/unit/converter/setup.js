/**
 * Jest test harness for src/dist/converter.js.
 *
 * converter.js expects globals `marked`, `TurndownService`, `turndownPluginGfm`
 * (UMD-style — same as how the AssetBundle loads them in the browser).
 * In jsdom we attach them to `global` (alias of `window`), then require
 * converter.js which will populate `window.Yii2Markdown.Converter`.
 */
const path = require('path');

function bootstrapConverter() {
    // Fresh require cache so converter.js re-initialises each test file.
    jest.resetModules();

    // 1. marked (ESM / UMD — npm marked@12 ships both; we pick CJS)
    //    marked 12 exports { marked, parse, ... }. We need a callable `parse`.
    //    The minified UMD we ship to browsers attaches `window.marked`.
    //    Here we replicate the browser shape by loading the UMD bundle.
    // For robustness, attach both `parse` and callable form.
    const markedModule = require('marked');
    // marked v12: the module exports named `marked` (instance) with .parse
    if (markedModule && markedModule.marked) {
        global.marked = markedModule.marked;
        if (typeof global.marked === 'function') {
            // ok — callable
        } else if (typeof markedModule.parse === 'function') {
            global.marked = { parse: markedModule.parse };
        }
    } else if (typeof markedModule === 'function') {
        global.marked = markedModule;
    } else if (markedModule && typeof markedModule.parse === 'function') {
        global.marked = markedModule;
    } else {
        global.marked = markedModule;
    }

    // 2. TurndownService
    const TurndownService = require('turndown');
    global.TurndownService = TurndownService && TurndownService.default ? TurndownService.default : TurndownService;

    // 3. turndown-plugin-gfm
    const gfm = require('turndown-plugin-gfm');
    global.turndownPluginGfm = gfm && gfm.default ? gfm.default : gfm;

    // Ensure window === global in jsdom
    if (typeof window !== 'undefined') {
        window.marked = global.marked;
        window.TurndownService = global.TurndownService;
        window.turndownPluginGfm = global.turndownPluginGfm;
        // Clear any previously-registered Converter so we re-run the IIFE.
        if (window.Yii2Markdown) delete window.Yii2Markdown;
    }

    // 4. Load converter.js — this IIFE attaches window.Yii2Markdown.Converter
    //    and also returns CommonJS module.exports.
    const converterPath = path.resolve(__dirname, '../../../src/dist/converter.js');
    // Reset module cache so we re-run the IIFE and re-read window state.
    delete require.cache[converterPath];
    const Converter = require(converterPath);
    return Converter;
}

module.exports = { bootstrapConverter };
