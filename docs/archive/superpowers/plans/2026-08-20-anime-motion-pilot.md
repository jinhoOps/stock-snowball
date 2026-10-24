# Anime.js Motion Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Anime.js 4.5.0 as the UI animation pilot and remove Motion usage from KPIGrid, ProductHero, GlobalNav, and BacktestView while keeping framer-motion available for later workstreams.

**Architecture:** Workstream 3 is a limited migration. KPIGrid becomes the Anime.js pilot because it has coordinated decorative effects and delayed hover behavior; simple ProductHero, GlobalNav, and BacktestView animations move to CSS so Anime.js does not become a wrapper around trivial transitions. Motion and Anime.js never control the same DOM element or transform property.

**Tech Stack:** React 19.2.8, TypeScript 6.0.3, Vite 6.4.x, Tailwind CSS 3.4.x, Anime.js 4.5.0, framer-motion 12.38.0 retained temporarily.

**Spec:** `docs/superpowers/specs/2026-08-14-frontend-stack-modernization-design.md`

## Global Constraints

- Workstream 3 scope only: skip RxDB/Dexie, Tailwind, Vite, TypeScript, Node, and Motion package removal.
- Install Anime.js exactly as `animejs: "4.5.0"`.
- Do not add new Motion imports or new `motion.*`, `AnimatePresence`, `layoutId`, `whileHover`, or `whileTap` usage.
- Keep `framer-motion: "12.38.0"` in `package.json` until Workstream 4 reaches zero imports.
- Use CSS/Tailwind for hover, active, focus, one-element opacity, and one-element transform transitions.
- Use Anime.js only for KPIGrid coordinated decorative effects and component-scoped lifecycle cleanup in this workstream.
- Every Anime.js integration must be scoped to the component root with `createScope({ root })` and must call `scope.revert()` on unmount.
- Respect `prefers-reduced-motion`; reduced motion renders final visible state without delayed decorative motion.
- Production JavaScript gzip may increase by no more than 12 KiB while Motion remains.
- Browser smoke must cover desktop and mobile, and must check no console errors from Anime.js, ResizeObserver, Visx, or React peer resolution.

---

## File Structure

- Modify `package.json` and `package-lock.json`: add exact `animejs` dependency; keep `framer-motion`.
- Create `src/lib/animation/usePrefersReducedMotion.ts`: shared hook replacing Motion's `useReducedMotion` where migrated files need the media query.
- Create `src/lib/animation/__tests__/usePrefersReducedMotion.test.tsx`: jsdom proof for initial match, change events, and server-safe fallback.
- Modify `src/components/sections/KPIGrid.tsx`: remove Motion; use Anime.js for card entrance and decorative hover effects; use CSS for tap/hover micro-interactions.
- Create `src/components/sections/__tests__/KPIGrid.animation.test.tsx`: migration guard and reduced-motion behavior proof.
- Modify `src/components/sections/ProductHero.tsx`: remove Motion; replace entrance and tap effects with CSS classes.
- Modify `src/components/layout/GlobalNav.tsx`: remove Motion; replace tap effects with CSS active-state transforms.
- Modify `src/components/sections/BacktestView.tsx`: remove Motion and `useReducedMotion`; replace table row entrance with CSS animation delay and reduced-motion media handling.
- Modify `src/index.css`: add named, narrowly-scoped animation utilities used by migrated components.
- Create `src/components/sections/__tests__/motionMigration.test.ts`: source guard for Workstream 3 files.
- Create `docs/superpowers/reports/2026-08-20-workstream-3-anime-motion-pilot.md`: bundle, test, browser, audit, and remaining Motion import report.

---

### Task 1: Dependency And Reduced-Motion Foundation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/animation/usePrefersReducedMotion.ts`
- Create: `src/lib/animation/__tests__/usePrefersReducedMotion.test.tsx`

**Interfaces:**
- Consumes: browser `window.matchMedia('(prefers-reduced-motion: reduce)')`.
- Produces: `usePrefersReducedMotion(): boolean`, used by KPIGrid and any later migrated component that cannot rely only on CSS media queries.

- [ ] **Step 1: Write the failing reduced-motion hook test**

Create `src/lib/animation/__tests__/usePrefersReducedMotion.test.tsx`:

```tsx
// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion';

type Listener = (event: MediaQueryListEvent) => void;

const renderProbe = () => {
  const Probe = () => (
    <span data-testid="motion-pref">{usePrefersReducedMotion() ? 'reduce' : 'no-preference'}</span>
  );
  return render(<Probe />);
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('usePrefersReducedMotion', () => {
  it('reads the initial media query state', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    renderProbe();

    expect(screen.getByTestId('motion-pref').textContent).toBe('reduce');
  });

  it('updates when the media query changes', () => {
    const listeners = new Set<Listener>();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: (_event: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_event: string, listener: Listener) => listeners.delete(listener),
    }));

    renderProbe();
    expect(screen.getByTestId('motion-pref').textContent).toBe('no-preference');

    listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));

    expect(screen.getByTestId('motion-pref').textContent).toBe('reduce');
  });

  it('falls back to no-preference when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);

    renderProbe();

    expect(screen.getByTestId('motion-pref').textContent).toBe('no-preference');
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- src/lib/animation/__tests__/usePrefersReducedMotion.test.tsx`

Expected: FAIL because `src/lib/animation/usePrefersReducedMotion.ts` does not exist.

- [ ] **Step 3: Add the hook implementation**

Create `src/lib/animation/usePrefersReducedMotion.ts`:

```ts
import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const readPreference = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
};

export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(readPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);

    setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};
```

- [ ] **Step 4: Install Anime.js exactly**

Run: `npm install animejs@4.5.0 --save-exact`

Expected: `package.json` contains `"animejs": "4.5.0"` and still contains `"framer-motion": "12.38.0"`.

- [ ] **Step 5: Run foundation checks**

Run:

```bash
npm test -- src/lib/animation/__tests__/usePrefersReducedMotion.test.tsx
npm ls animejs framer-motion --depth=0
```

Expected: hook tests pass; `animejs@4.5.0` and `framer-motion@12.38.0` are both installed.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/animation/usePrefersReducedMotion.ts src/lib/animation/__tests__/usePrefersReducedMotion.test.tsx
git commit -m "feat: add animejs motion foundation"
```

---

### Task 2: KPIGrid Anime.js Pilot

**Files:**
- Modify: `src/components/sections/KPIGrid.tsx`
- Create: `src/components/sections/__tests__/KPIGrid.animation.test.tsx`

**Interfaces:**
- Consumes: `usePrefersReducedMotion(): boolean` from Task 1.
- Consumes: `animate`, `createScope`, and `stagger` from `animejs`.
- Produces: a Motion-free `KPIGrid` where `.kpi-card`, `.kpi-hidden-snowflake`, `.kpi-rolling-snowball`, `.kpi-snow-overlay`, `.kpi-snow-particle`, `.kpi-snow-base`, `.kpi-milestone`, and `.kpi-share-button` are the scoped animation targets.

- [ ] **Step 1: Write the KPIGrid migration test**

Create `src/components/sections/__tests__/KPIGrid.animation.test.tsx`:

```tsx
// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import KPIGrid from '../KPIGrid';

const createScope = vi.fn();
const animate = vi.fn();
const revert = vi.fn();

vi.mock('animejs', () => ({
  animate,
  createScope,
  stagger: (amount: number) => (_target: Element, index: number) => index * amount,
}));

const baseProps = {
  totalAsset: 100_000,
  initialPrincipal: 10_000,
  totalContribution: 50_000,
  totalReturn: 50_000,
  returnPercentage: 100,
  cagr: 7.5,
  currency: 'USD' as const,
  exchangeRate: 1450,
  isMilestoneReached: true,
  onShare: vi.fn(),
};

const stubMotionPreference = (matches: boolean) => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('KPIGrid Anime.js migration', () => {
  it('scopes Anime.js to the grid root and reverts on unmount', () => {
    createScope.mockImplementation(() => ({ add: vi.fn((callback: () => void) => callback()), revert }));
    animate.mockReturnValue({ revert: vi.fn(), restart: vi.fn(), cancel: vi.fn() });
    stubMotionPreference(false);

    const { unmount } = render(<KPIGrid {...baseProps} />);

    expect(createScope).toHaveBeenCalledTimes(1);
    expect(createScope.mock.calls[0][0].root).toBeInstanceOf(HTMLDivElement);
    expect(animate).toHaveBeenCalled();

    unmount();

    expect(revert).toHaveBeenCalledTimes(1);
  });

  it('skips Anime.js animation calls when reduced motion is requested', () => {
    createScope.mockImplementation(() => ({ add: vi.fn((callback: () => void) => callback()), revert }));
    stubMotionPreference(true);

    render(<KPIGrid {...baseProps} />);

    expect(createScope).not.toHaveBeenCalled();
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByText('Milestone')).toBeTruthy();
  });

  it('keeps controls usable after replacing Motion hover and tap handlers', () => {
    createScope.mockImplementation(() => ({ add: vi.fn((callback: () => void) => callback()), revert }));
    animate.mockReturnValue({ revert: vi.fn(), restart: vi.fn(), cancel: vi.fn() });
    stubMotionPreference(false);

    render(<KPIGrid {...baseProps} />);
    fireEvent.mouseEnter(screen.getByText('총 투자 원금').closest('.kpi-card') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: '공유(이미지)' }));

    expect(baseProps.onShare).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- src/components/sections/__tests__/KPIGrid.animation.test.tsx`

Expected: FAIL because KPIGrid still imports Motion and does not call Anime.js.

- [ ] **Step 3: Replace KPIGrid Motion imports and root setup**

In `src/components/sections/KPIGrid.tsx`, change imports:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { animate, createScope, stagger } from 'animejs';
import { SnowballEngine } from '../../core/SnowballEngine';
import AnimatedCounter from '../common/AnimatedCounter';
import { BigNumberHelper } from '../common/BigNumberHelper';
import { Share2, Snowflake } from 'lucide-react';
import { usePrefersReducedMotion } from '../../lib/animation/usePrefersReducedMotion';
```

Inside `KPIGrid`, add:

```tsx
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || !rootRef.current) {
      return undefined;
    }

    const scope = createScope({ root: rootRef.current }).add(() => {
      animate('.kpi-card', {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 600,
        delay: stagger(100),
        ease: 'out(3)',
      });

      animate('.kpi-share-button', {
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 500,
        delay: 500,
        ease: 'out(3)',
      });
    });

    return () => scope.revert();
  }, [prefersReducedMotion]);
```

Attach `ref={rootRef}` to the outer KPIGrid `<div>`.

- [ ] **Step 4: Convert KPICard shell to plain React and CSS states**

Replace the `motion.div` card shell with a plain `<div>`:

```tsx
    <div
      className={`kpi-card bg-apple-surface-pearl/80 backdrop-blur-md border border-white/60 rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:border-apple-primary/40 active:scale-[0.98] shadow-sm hover:shadow-md relative overflow-hidden group select-none ${isHighlighted ? 'ring-2 ring-apple-primary/30 bg-apple-surface-pearl' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={() => setIsHovered(true)}
      onPointerCancel={() => setIsHovered(false)}
      onPointerUp={() => setIsHovered(false)}
    >
```

Set the closing tag to `</div>`.

- [ ] **Step 5: Convert KPI decorative nodes to Anime.js target classes**

Replace Motion wrappers under the card with plain elements:

```tsx
      {isHighlighted && (
        <div className="kpi-hidden-snowflake absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none text-apple-primary/10">
          <Snowflake size={150} strokeWidth={1} />
        </div>
      )}

      {showRollingSnowball && (
        <div className="kpi-rolling-snowball absolute bottom-1.5 left-0 text-apple-primary/60 z-10 pointer-events-none opacity-0">
          <Snowflake size={20} strokeWidth={2.5} />
        </div>
      )}

      {showSnowAccumulation && (
        <div className="kpi-snow-overlay absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-xl opacity-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="kpi-snow-particle absolute w-1 h-1 bg-apple-primary/20 rounded-full blur-[0.5px]"
              style={{ top: '-10%', left: `${10 + i * 15}%` }}
            />
          ))}
          <div className="kpi-snow-base absolute bottom-0 left-0 right-0 h-0">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-200/20 via-cyan-100/20 to-indigo-200/20 blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-apple-primary/10 to-transparent" />
          </div>
        </div>
      )}
```

Replace the milestone `AnimatePresence` block with:

```tsx
      {isHighlighted && isMilestoneReached && (
        <div className="kpi-milestone mt-3 bg-apple-primary text-apple-on-dark text-[10px] font-bold px-3 py-1 rounded-pill uppercase tracking-widest font-display relative z-10 shadow-sm">
          Milestone
        </div>
      )}
```

- [ ] **Step 6: Add hover-triggered Anime.js effects**

In `KPICard`, add refs for hover animation instances only through classes and local effects:

```tsx
  useEffect(() => {
    if (prefersReducedMotion) {
      return undefined;
    }

    const card = cardRef.current;
    if (!card) {
      return undefined;
    }

    const hiddenSnowflake = card.querySelector('.kpi-hidden-snowflake');
    const rollingSnowball = card.querySelector('.kpi-rolling-snowball');
    const snowOverlay = card.querySelector('.kpi-snow-overlay');
    const snowParticles = card.querySelectorAll('.kpi-snow-particle');
    const snowBase = card.querySelector('.kpi-snow-base');

    const animations = [
      hiddenSnowflake && animate(hiddenSnowflake, {
        opacity: isHovered ? 1 : 0,
        scale: isHovered ? 1.5 : 1,
        rotate: isHovered ? 180 : 0,
        duration: isHovered ? 2000 : 250,
        delay: isHovered ? 3300 : 0,
        ease: 'out(3)',
      }),
      rollingSnowball && animate(rollingSnowball, {
        translateX: isHovered ? ['0%', '450%'] : '-20%',
        rotate: isHovered ? [0, 720] : 0,
        opacity: isHovered ? [0, 1, 1, 0] : 0,
        duration: isHovered ? 2500 : 200,
        delay: isHovered ? 3300 : 0,
        ease: 'linear',
      }),
      snowOverlay && animate(snowOverlay, {
        opacity: isHovered ? 1 : 0,
        duration: isHovered ? 2000 : 250,
        delay: isHovered ? 3300 : 0,
        ease: 'out(3)',
      }),
      snowBase && animate(snowBase, {
        height: isHovered ? 32 : 0,
        duration: isHovered ? 3000 : 250,
        delay: isHovered ? 3300 : 0,
        ease: 'out(4)',
      }),
      snowParticles.length > 0 && animate(snowParticles, {
        translateY: isHovered ? ['-10%', '110%'] : '-10%',
        translateX: [0, 10, -10, 0],
        duration: 3000,
        delay: (_target, index) => isHovered ? 3300 + index * 500 : 0,
        loop: isHovered,
        ease: 'linear',
      }),
    ].filter(Boolean);

    return () => animations.forEach((animation) => animation.revert());
  }, [isHovered, prefersReducedMotion]);
```

Before this step, add `prefersReducedMotion` and `cardRef` to `KPICard` props and attach `ref={cardRef}` to the card shell. The parent passes `prefersReducedMotion={prefersReducedMotion}`.

- [ ] **Step 7: Convert the share button to CSS**

Replace the `motion.button` with:

```tsx
        <button
          onClick={onShare}
          className="kpi-share-button mt-10 flex items-center gap-2 bg-apple-ink/90 backdrop-blur-md text-apple-on-dark px-8 py-3 rounded-pill font-semibold text-button-utility shadow-lg hover:bg-apple-ink active:scale-[0.98] transition-all group"
        >
          <Share2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          공유(이미지)
        </button>
```

- [ ] **Step 8: Run KPI checks**

Run:

```bash
npm test -- src/components/sections/__tests__/KPIGrid.animation.test.tsx
rg -n "framer-motion|motion\\.|AnimatePresence|whileHover|whileTap|layoutId" src/components/sections/KPIGrid.tsx
```

Expected: KPIGrid animation tests pass; `rg` returns no matches in `KPIGrid.tsx`.

- [ ] **Step 9: Commit**

```bash
git add src/components/sections/KPIGrid.tsx src/components/sections/__tests__/KPIGrid.animation.test.tsx
git commit -m "feat: pilot animejs in kpi grid"
```

---

### Task 3: Retire Simple Motion Usage With CSS

**Files:**
- Modify: `src/components/sections/ProductHero.tsx`
- Modify: `src/components/layout/GlobalNav.tsx`
- Modify: `src/components/sections/BacktestView.tsx`
- Modify: `src/index.css`
- Create: `src/components/sections/__tests__/motionMigration.test.ts`

**Interfaces:**
- Consumes: CSS utility classes `.animate-apple-rise`, `.animate-apple-fade`, and `.animate-table-row-rise`.
- Produces: Motion-free ProductHero, GlobalNav, and BacktestView. Remaining Motion imports are allowed only in files outside Workstream 3.

- [ ] **Step 1: Write the source migration guard**

Create `src/components/sections/__tests__/motionMigration.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the guard and confirm it fails**

Run: `npm test -- src/components/sections/__tests__/motionMigration.test.ts`

Expected: FAIL because ProductHero, GlobalNav, and BacktestView still import Motion.

- [ ] **Step 3: Add scoped CSS animations**

Append these utilities to `src/index.css`:

```css
@keyframes apple-rise {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes apple-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes table-row-rise {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-apple-rise {
  animation: apple-rise 800ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.animate-apple-fade {
  animation: apple-fade 1000ms ease both;
}

.animate-table-row-rise {
  animation: table-row-rise 200ms ease both;
}

@media (prefers-reduced-motion: reduce) {
  .animate-apple-rise,
  .animate-apple-fade,
  .animate-table-row-rise {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

- [ ] **Step 4: Replace ProductHero Motion with CSS**

In `src/components/sections/ProductHero.tsx`, remove `import { motion } from 'framer-motion';`.

Replace the first `motion.div` with:

```tsx
      <div className="mt-[80px] px-4 animate-apple-rise">
```

Replace the CTA `motion.button` with:

```tsx
            <button className="bg-apple-primary text-apple-on-primary px-8 py-3 rounded-pill text-button-utility font-medium hover:bg-apple-primary-focus active:scale-95 transition-colors shadow-sm">
              {ctaText}
            </button>
```

Replace the visualization `motion.div` with:

```tsx
      <div className="w-full px-4 pb-20 flex-grow flex items-center justify-center animate-apple-fade [animation-delay:300ms]">
        {children}
      </div>
```

- [ ] **Step 5: Replace GlobalNav Motion with CSS**

In `src/components/layout/GlobalNav.tsx`, remove `import { motion } from 'framer-motion';`.

Replace logo with:

```tsx
        <a
          href={import.meta.env.BASE_URL}
          className="flex items-center justify-center h-full min-w-[44px] hover:opacity-80 active:scale-95 transition-all"
        >
          <Snowflake size={18} className="text-apple-primary-on-dark" />
        </a>
```

Replace settings button with:

```tsx
        <button
          onClick={onOpenAdvanced}
          className="flex items-center justify-center h-[44px] w-[44px] text-apple-ink-muted hover:opacity-80 active:scale-90 transition-all"
          aria-label="고급 설정 열기"
        >
          <Settings size={18} className="text-apple-on-dark/80" />
        </button>
```

- [ ] **Step 6: Replace BacktestView row Motion with CSS**

In `src/components/sections/BacktestView.tsx`, remove `import { motion, useReducedMotion } from 'framer-motion';` and remove `const reduceMotion = useReducedMotion();`.

Replace the row with:

```tsx
                <tr
                  key={result.assetId}
                  className="animate-table-row-rise border-b border-apple-hairline last:border-0"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
```

Replace `</motion.tr>` with `</tr>`.

- [ ] **Step 7: Run focused migration checks**

Run:

```bash
npm test -- src/components/sections/__tests__/motionMigration.test.ts src/components/sections/__tests__/BacktestView.test.tsx
rg -n "framer-motion|motion\\.|AnimatePresence|whileHover|whileTap|layoutId|useReducedMotion" src/components/sections/KPIGrid.tsx src/components/sections/ProductHero.tsx src/components/layout/GlobalNav.tsx src/components/sections/BacktestView.tsx
```

Expected: tests pass; `rg` returns no matches in the four migrated files.

- [ ] **Step 8: Commit**

```bash
git add src/components/sections/ProductHero.tsx src/components/layout/GlobalNav.tsx src/components/sections/BacktestView.tsx src/index.css src/components/sections/__tests__/motionMigration.test.ts
git commit -m "refactor: retire simple motion usage"
```

---

### Task 4: Verification, Bundle Evidence, And Report

**Files:**
- Create: `docs/superpowers/reports/2026-08-20-workstream-3-anime-motion-pilot.md`

**Interfaces:**
- Consumes: output from npm, rg, Vite build, and Orca browser smoke.
- Produces: final Workstream 3 acceptance report with remaining risks and Workstream 4 handoff notes.

- [ ] **Step 1: Capture Motion import count**

Run:

```bash
rg -n "from 'framer-motion'|from \"framer-motion\"" src
```

Expected: no matches in `KPIGrid.tsx`, `ProductHero.tsx`, `GlobalNav.tsx`, or `BacktestView.tsx`; remaining matches are limited to files deferred to Workstream 4.

- [ ] **Step 2: Run full unit suite**

Run: `npm test`

Expected: all application tests pass.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite production build pass; PWA generation completes.

- [ ] **Step 4: Record JavaScript bundle sizes**

Run:

```bash
node -e "const fs=require('fs'); const zlib=require('zlib'); const files=fs.readdirSync('dist/assets').filter((f)=>f.endsWith('.js')); let raw=0,gzip=0; for (const f of files) { const b=fs.readFileSync('dist/assets/'+f); raw+=b.length; gzip+=zlib.gzipSync(b).length; console.log(f, (b.length/1024).toFixed(2)+' kB', (zlib.gzipSync(b).length/1024).toFixed(2)+' kB gzip'); } console.log('TOTAL_JS', (raw/1024).toFixed(2)+' kB', (gzip/1024).toFixed(2)+' kB gzip');"
```

Expected: total production JavaScript gzip increase is at most 12 KiB versus the Workstream 2 baseline used for this branch. If the exact Workstream 2 baseline is not available yet because storage migration was skipped, record the current `origin/main` build as the temporary baseline and label it as such.

- [ ] **Step 5: Run audit**

Run: `npm audit --json`

Expected: audit remains at the known Workstream 1 deferred level or changes are explained by package metadata. Anime.js must not introduce a new direct vulnerability.

- [ ] **Step 6: Browser smoke in Orca internal browser**

Run the dev server:

```bash
npm run dev -- --host 127.0.0.1
```

Use Orca browser:

```bash
orca goto --url http://127.0.0.1:<port> --json
orca wait --selector "#root" --json
orca snapshot --json
orca console --limit 100 --json
```

Smoke actions:

- Hover KPI cards long enough to trigger decorative effects.
- Click `공유(이미지)` when present.
- Open advanced settings through GlobalNav.
- Switch to the backtest/comparison view and confirm the results table and chart render.
- Repeat a mobile-width check if Orca viewport control works in the current runtime; otherwise record the actual Orca viewport and use static responsive evidence for mobile.

Expected: no Anime.js, ResizeObserver, Visx, or React peer console errors; controls remain clickable; reduced-motion CSS rule exists and tests cover the hook.

- [ ] **Step 7: Write the report**

Create `docs/superpowers/reports/2026-08-20-workstream-3-anime-motion-pilot.md` with:

```markdown
# Workstream 3 Anime.js Motion Pilot Report

## Summary

- Branch: `jinhoOps/anime-motion-pilot`
- Scope: Anime.js 4.5.0 pilot plus Motion removal from KPIGrid, ProductHero, GlobalNav, and BacktestView.
- Deferred: framer-motion package removal and remaining Motion imports for Workstream 4.

## Dependency Result

- `animejs`: 4.5.0
- `framer-motion`: 12.38.0 retained

## Motion Import Result

Record the exact `rg` output and remaining file count.

## Verification

Record `npm test`, `npm run build`, `npm audit --json` severity totals, and browser smoke result.

## Bundle Result

Record per-file JavaScript bundle size and total gzip size. State whether the temporary Workstream 3 limit passed.

## Browser Smoke

Record desktop viewport, mobile/static fallback, console result, and changed flows exercised.

## Rollback

Revert the Workstream 3 commits in reverse order:

1. `refactor: retire simple motion usage`
2. `feat: pilot animejs in kpi grid`
3. `feat: add animejs motion foundation`

Rollback restores Motion ownership for the migrated components and removes Anime.js if no later workstream depends on it.

## Workstream 4 Handoff

Remaining Motion owners: App presence, AnimatedCounter, Tooltip, ScenarioPresetPicker, SimulationControls, BacktestChart, SnowballChart, and AdvancedSettingsSheet.
```

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/reports/2026-08-20-workstream-3-anime-motion-pilot.md
git commit -m "docs: report anime motion pilot"
```

- [ ] **Step 9: Final status**

Run:

```bash
git status --short --branch
git log --oneline --decorate -5
```

Expected: clean worktree on `jinhoOps/anime-motion-pilot`, with the three implementation commits and one report commit.

---

## Plan Self-Review

- Spec coverage: Workstream 3 requirements are covered: Anime.js 4.5.0 added, KPIGrid pilot uses scoped Anime.js cleanup, ProductHero/GlobalNav/BacktestView simple Motion usage moves to CSS, reduced motion is tested, bundle/audit/browser evidence is recorded, and `framer-motion` remains for Workstream 4.
- Placeholder scan: no unfinished marker tokens or unspecified implementation steps remain.
- Type consistency: the only new shared interface is `usePrefersReducedMotion(): boolean`; all component tasks consume that exact function name. Anime.js imports are `animate`, `createScope`, and `stagger` from `animejs`.
