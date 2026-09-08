/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '../../../..');

const readSource = (path: string) => readFileSync(resolve(repoRoot, path), 'utf8');

describe('Workstream 3 Motion migration guard', () => {
  const migratedFiles = [
    'src/components/sections/KPIGrid.tsx',
    'src/components/sections/ProductHero.tsx',
    'src/components/layout/GlobalNav.tsx',
    'src/components/sections/BacktestView.tsx',
  ];

  it('removes Motion imports and JSX from migrated files', () => {
    for (const file of migratedFiles) {
      const source = readSource(file);

      expect(source).not.toContain('framer-motion');
      expect(source).not.toContain('<motion.');
      expect(source).not.toContain('</motion.');
      expect(source).not.toContain('AnimatePresence');
      expect(source).not.toContain('whileHover');
      expect(source).not.toContain('whileTap');
      expect(source).not.toContain('layoutId');
    }
  });

  it('keeps framer-motion installed for later workstreams', () => {
    const packageJson = JSON.parse(readSource('package.json')) as {
      dependencies: Record<string, string>;
    };

    expect(packageJson.dependencies['framer-motion']).toBe('12.38.0');
    expect(packageJson.dependencies.animejs).toBe('4.5.0');
  });

});
