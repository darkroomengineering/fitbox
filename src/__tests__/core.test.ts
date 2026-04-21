import { beforeEach, describe, expect, it, vi } from 'vitest';

// Pretext is mocked so these tests exercise our arithmetic, not the font engine.
vi.mock('@chenglou/pretext', () => {
  // Model a monospace-like font where every character is `charWidth` at 1px.
  // This lets us drive exact expectations.
  const charWidth = 0.5;
  return {
    prepareWithSegments: (text: string) => ({ text, charWidth }),
    measureNaturalWidth: (h: { text: string; charWidth: number }) =>
      h.text.length * h.charWidth,
    measureLineStats: (
      h: { text: string; charWidth: number },
      maxWidth: number,
    ) => {
      // Naively wrap on characters: no word breaks. Good enough for math tests.
      const natural = h.text.length * h.charWidth;
      if (maxWidth >= natural) return { lineCount: 1, maxLineWidth: natural };
      const charsPerLine = Math.max(1, Math.floor(maxWidth / h.charWidth));
      const lineCount = Math.ceil(h.text.length / charsPerLine);
      return { lineCount, maxLineWidth: charsPerLine * h.charWidth };
    },
  };
});

import { fit, fluidFit, fluidFitMultiLine, prepare } from '../core/index.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('prepare', () => {
  it('returns a handle with naturalWidth derived at 1px', () => {
    const handle = prepare('abcd', 'Inter');
    expect(handle.naturalWidth).toBeCloseTo(4 * 0.5, 6);
  });
});

describe('fit - single line closed form', () => {
  it('solves width / naturalWidth exactly', () => {
    const handle = prepare('abcdefgh', 'Inter');
    // naturalWidth = 4px at 1px → at width 800 fontSize should be 200
    const result = fit(handle, { width: 800 });
    expect(result.fontSize).toBeCloseTo(200, 6);
    expect(result.lineCount).toBe(1);
  });

  it('clamps to maxSize', () => {
    const handle = prepare('ab', 'Inter');
    const result = fit(handle, { width: 10_000, maxSize: 72 });
    expect(result.fontSize).toBe(72);
  });

  it('clamps to minSize', () => {
    const handle = prepare('aaaaaaaaaa', 'Inter');
    const result = fit(handle, { width: 1, minSize: 10 });
    expect(result.fontSize).toBe(10);
  });
});

describe('fit - multi-line binary search', () => {
  it('finds the largest fontSize that fits maxLines', () => {
    // 20 chars, naturalWidth at 1px = 10. box width 100, maxLines 2.
    // At fontSize s: effective 1px-width = 100/s.
    // Chars per line at 1px = floor(100/s / 0.5) = floor(200/s).
    // Lines at 1px = ceil(20 / floor(200/s)).
    // Want lines ≤ 2 → floor(200/s) ≥ 10 → 200/s ≥ 10 → s ≤ 20.
    const handle = prepare('abcdefghijklmnopqrst', 'Inter');
    const result = fit(handle, { width: 100, maxLines: 2 });
    expect(result.fontSize).toBeGreaterThan(19.5);
    expect(result.fontSize).toBeLessThanOrEqual(20);
    expect(result.lineCount).toBeLessThanOrEqual(2);
  });

  it('respects height bound', () => {
    const handle = prepare('abcdefghij', 'Inter');
    // 10 chars, naturalWidth 5. width 50 → single-line fits at fontSize 10.
    // But with height 15 and lineHeight 1.2: 1 line * 10 * 1.2 = 12 ≤ 15. Fine.
    // With height 10 and lineHeight 1.2: need s * 1.2 ≤ 10 → s ≤ 8.33.
    const result = fit(handle, { width: 50, height: 10, lineHeight: 1.2 });
    expect(result.fontSize).toBeLessThanOrEqual(10 / 1.2 + 0.5);
  });
});

describe('fluidFit', () => {
  it('emits clamp(min, calc(intercept + slope*vw), max)', () => {
    // naturalWidth = 2 at 1px (4 chars × 0.5)
    const handle = prepare('abcd', 'Inter');
    // widthFraction 1, minVw 320 → sMin = 160, maxVw 1440 → sMax = 720
    const result = fluidFit(handle, { minViewport: 320, maxViewport: 1440 });
    expect(result.minSize).toBeCloseTo(160, 3);
    expect(result.maxSize).toBeCloseTo(720, 3);
    // slope = (720 - 160) / (1440 - 320) = 560 / 1120 = 0.5 px per viewport-px
    expect(result.slope).toBeCloseTo(0.5, 6);
    // intercept = 160 - 0.5 * 320 = 0
    expect(result.intercept).toBeCloseTo(0, 6);
    // 0.5 px per viewport-px == 50vw
    expect(result.cssClamp).toMatch(/^clamp\(160px, calc\(0px \+ 50vw\), 720px\)$/);
  });

  it('respects floor and ceiling', () => {
    const handle = prepare('a', 'Inter');
    // naturalWidth = 0.5 → very small text; at 320vw sMin would be 640. Floor at 12.
    // Ceiling at 24.
    const result = fluidFit(handle, {
      minViewport: 320,
      maxViewport: 1440,
      minSize: 12,
      maxSize: 24,
    });
    expect(result.minSize).toBe(24); // clamped to ceil
    expect(result.maxSize).toBe(24);
  });
});

describe('fluidFitMultiLine', () => {
  it('emits a single segment with no media queries when lineCount is stable', () => {
    const handle = prepare('abcd', 'Inter');
    const result = fluidFitMultiLine(handle, {
      minViewport: 320,
      maxViewport: 1440,
      maxLines: 1,
      samples: 8,
    });
    expect(result.segments.length).toBe(1);
    expect(result.segments[0]?.lineCount).toBe(1);
    expect(result.css).toMatch(/^\.fitbox-fluid \{ font-size: clamp\(/);
    expect(result.css).not.toContain('@media');
  });

  it('splits into multiple segments when lineCount changes', () => {
    // 40 chars × 0.5 = naturalWidth 20 at 1px.
    // At small viewports, text must wrap to stay within maxLines with reasonable font.
    // At large viewports, single line suffices.
    const handle = prepare('a'.repeat(40), 'Inter');
    const result = fluidFitMultiLine(handle, {
      minViewport: 100,
      maxViewport: 2000,
      maxLines: 4,
      samples: 32,
      minSize: 4,
      maxSize: 200,
    });
    expect(result.segments.length).toBeGreaterThan(1);
    // later segments should have fewer lines
    const lineCounts = result.segments.map((s) => s.lineCount);
    expect(Math.max(...lineCounts)).toBeGreaterThan(Math.min(...lineCounts));
    // CSS has media queries for all but the first segment
    const mediaCount = (result.css.match(/@media/g) ?? []).length;
    expect(mediaCount).toBe(result.segments.length - 1);
  });

  it('respects a custom selector', () => {
    const handle = prepare('abcd', 'Inter');
    const result = fluidFitMultiLine(handle, {
      minViewport: 320,
      maxViewport: 1440,
      maxLines: 2,
      selector: 'h1.hero',
      samples: 4,
    });
    expect(result.css).toContain('h1.hero {');
  });
});

describe('server LRU cache', () => {
  it('evicts the least-recently-used entry past the cap', async () => {
    const { fitCached, clearServerCache, configureServerCanvas } = await import(
      '../server/index.js'
    );
    clearServerCache();
    // Shrink the cache to 2 so we can observe eviction.
    configureServerCanvas(
      () => ({ getContext: () => ({ measureText: () => ({ width: 0 }), font: '' }) }),
      { cacheMax: 2 },
    );

    const a = fitCached('aaaa', 'Inter', { width: 100 });
    const b = fitCached('bbbb', 'Inter', { width: 100 });
    // touch a so it becomes MRU
    fitCached('aaaa', 'Inter', { width: 100 });
    // inserting c should evict b, not a
    fitCached('cccc', 'Inter', { width: 100 });

    // If we re-request a, we should NOT call prepare again: result object is identical.
    const aAgain = fitCached('aaaa', 'Inter', { width: 100 });
    expect(aAgain).toBe(a);

    // b should have been evicted → a fresh call returns a NEW object
    const bAgain = fitCached('bbbb', 'Inter', { width: 100 });
    expect(bAgain).not.toBe(b);

    clearServerCache();
  });
});
