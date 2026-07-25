import type { FitOptions, FitResult, PrepareOptions } from "../core";

export function resolveFont(el: HTMLElement): string {
  const cs = getComputedStyle(el);
  return `${cs.fontStyle} ${cs.fontWeight} 1px ${cs.fontFamily}`;
}

/**
 * Best-effort wait for web fonts to finish loading before measuring, so the
 * fit reflects the real glyph metrics rather than the fallback font. Resolves
 * immediately when fonts are already loaded, or when there is no document
 * (SSR). Shared by `useFit` and `useFitText` — the one piece of lifecycle
 * both genuinely have in common.
 */
export async function awaitFontsReady(): Promise<void> {
  if (typeof document === 'undefined' || document.fonts.status === 'loaded') return;
  try {
    await document.fonts.ready;
  } catch {
    // proceed with whatever font is currently available
  }
}

export type UseFitOptions = Omit<FitOptions, 'width'> & {
  /**
   * Override the font used for measurement. When omitted, the hook reads
   * `font-family`, `font-weight`, and `font-style` from the element's
   * computed style — the element inherits these from ancestors via normal
   * CSS, so most callers need not pass this at all.
   */
  family?: string;
  prepare?: PrepareOptions;
};

export type UseFitTextOptions = UseFitOptions & {
  preset?: FitResult;
};

export type UseFitTextResult<_CSSProperties, E extends HTMLElement = HTMLElement> = {
  ref: (node: E | null) => void;
  style: _CSSProperties | undefined;
  result: FitResult | null;
};
