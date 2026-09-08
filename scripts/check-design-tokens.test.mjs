import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./check-design-tokens.mjs', import.meta.url));

async function fixture(t, source) {
  const root = await mkdtemp(path.join(tmpdir(), 'snowball-design-check-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'src/__tests__'), { recursive: true });
  await writeFile(path.join(root, 'tailwind.config.ts'), `export default {
    content: [], theme: { extend: {
      colors: { apple: { primary: 'rgb(var(--color-primary) / <alpha-value>)' } },
      fontSize: { 'title-md': ['24px', { lineHeight: '1.25' }] },
      fontFamily: { display: ['system-ui'] },
      maxWidth: { content: '1000px' }
    } }
  }`);
  await writeFile(path.join(root, 'src/Example.tsx'), source);
  // Test examples must not create false alarms or mask missing application styles.
  await writeFile(path.join(root, 'src/__tests__/Example.test.tsx'),
    '<div className="text-apple-test-only" />');
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
}

test('accepts generated responsive and alpha utilities alongside ordinary typography', async t => {
  const root = await fixture(t, `<div className="sm:text-title-md hover:bg-apple-primary/20 [&:hover]:text-apple-primary/[0.25] max-w-content font-display text-left font-semibold" />`);
  const result = run(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Design tokens OK/);
});

test('reports unknown color, typography, font and width utilities with their source', async t => {
  const root = await fixture(t, `<div className="md:hover:text-apple-missing/80 [&:hover]:bg-apple-missing/[0.25] text-title-missing font-missing max-w-missing" />`);
  const result = run(root);
  assert.equal(result.status, 1, result.stderr || result.stdout);
  for (const token of ['md:hover:text-apple-missing/80', '[&:hover]:bg-apple-missing/[0.25]', 'text-title-missing', 'font-missing', 'max-w-missing']) {
    assert.ok(result.stderr.includes(token), result.stderr);
  }
  assert.match(result.stderr, /src\/Example\.tsx:1/);
  assert.doesNotMatch(result.stderr, /test-only/);
});

test('checks class maps in TypeScript and static parts of template strings', async t => {
  const root = await fixture(t, 'const variant = `text-title-missing ${active ? "text-left" : "font-semibold"}`;');
  await writeFile(path.join(root, 'src/styles.ts'), 'export const classes = { card: "max-w-missing" };');
  const result = run(root);
  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stderr, /text-title-missing/);
  assert.match(result.stderr, /max-w-missing/);
});
