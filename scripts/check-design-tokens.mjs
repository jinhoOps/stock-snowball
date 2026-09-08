import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import loadConfig from 'tailwindcss/loadConfig.js';
import ts from 'typescript';

// Inspect complete, static classes in application string literals and class maps.
// Custom component classes (ui-*, chart hooks, animations) are outside this check.
const tokenUtility = /^(?:text|font|bg|border(?:-[trblxyse])?|divide(?:-[xy])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|decoration|accent|caret|shadow|(?:min-|max-)?[wh]|size|rounded(?:-[trblse]{1,2})?|z|[mp][trblxyse]?|gap(?:-[xy])?|space-[xy])-[a-z][\w.-]*(?:\/(?:[\w.%-]+|\[[^\]\s]+\]))?$/;

function baseUtility(candidate) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < candidate.length; i++) {
    if (candidate[i] === '[' || candidate[i] === '(') depth++;
    if (candidate[i] === ']' || candidate[i] === ')') depth--;
    if (candidate[i] === ':' && depth === 0) start = i + 1;
  }
  return candidate.slice(start).replace(/^!-?|^-!|^-/, '');
}

function collectCandidates(file, source) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const candidates = [];
  const visit = node => {
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node)
      || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      for (const match of node.text.matchAll(/\S+/g)) {
        if (!tokenUtility.test(baseUtility(match[0]))) continue;
        const position = tree.getLineAndCharacterOfPosition(node.getStart(tree) + match.index);
        candidates.push({ name: match[0], location: `${file}:${position.line + 1}` });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return candidates;
}

function generatedClasses(css) {
  const names = new Set();
  css.walkRules(rule => {
    // Decode CSS class selectors, including escaped variants, opacity and hex escapes.
    for (const match of rule.selector.matchAll(/\.((?:\\(?:[0-9a-f]{1,6}\s?|.)|[\w-])+)/gi)) {
      names.add(match[1].replace(/\\([0-9a-f]{1,6}\s?|.)/gi, (_, escape) =>
        /^[0-9a-f]{1,6}\s?$/i.test(escape)
          ? String.fromCodePoint(parseInt(escape.trim(), 16)) : escape));
    }
  });
  return names;
}

async function check(root) {
  const files = (await readdir(path.join(root, 'src'), { recursive: true }))
    .filter(file => /\.(ts|tsx)$/.test(file)
      && !/(^|\/)(?:__tests__|__mocks__)(?:\/|$)/.test(file)
      && !/\.(?:test|spec)\.(?:ts|tsx)$/.test(file))
    .sort();
  const sources = await Promise.all(files.map(async file => ({
    file: `src/${file}`, source: await readFile(path.join(root, 'src', file), 'utf8'),
  })));
  const candidates = sources.flatMap(({ file, source }) => collectCandidates(file, source));
  const config = loadConfig(path.join(root, 'tailwind.config.ts'));
  const result = await postcss([tailwindcss({
    ...config,
    // Use the same application source as the audit; tests cannot safelist a token.
    content: sources.map(({ file, source }) => ({ raw: source, extension: path.extname(file).slice(1) })),
  })]).process('@tailwind utilities;', { from: undefined });
  const generated = generatedClasses(result.root);
  const missing = candidates.filter(candidate => !generated.has(candidate.name));
  if (missing.length) {
    console.error('Undefined design utilities (no generated Tailwind rule):');
    for (const line of new Set(missing.map(({ name, location }) => `  ${location}  ${name}`))) {
      console.error(line);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Design tokens OK: ${new Set(candidates.map(candidate => candidate.name)).size} utilities across ${files.length} application files.`);
}

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--root')) {
  console.error('Usage: node scripts/check-design-tokens.mjs [--root path]');
  process.exitCode = 1;
} else {
  const root = args[1] ? path.resolve(args[1]) : fileURLToPath(new URL('..', import.meta.url));
  await check(root);
}
