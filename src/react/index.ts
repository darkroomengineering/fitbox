import {
  type CSSProperties,
  createElement,
  type HTMLAttributes,
  type ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_LINE_HEIGHT,
  type FitHandle,
  type FitResult,
  type FluidFitResult,
  fit,
  prepare,
} from '../core/index';
import { awaitFontsReady, resolveFont, type UseFitOptions, type UseFitTextOptions, type UseFitTextResult as _UseFitTextResult } from '../shared/index';

export { type UseFitOptions, type UseFitTextOptions } from '../shared/index';

export type UseFitTextResult<E extends HTMLElement = HTMLElement> = _UseFitTextResult<CSSProperties, E>

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Drop a ref on any block-level element and it will fit its text to the
 * container, refitting on resize and on text changes.
 *
 * @example
 *   <h1 ref={useFit()}>Hello</h1>
 *   <p ref={useFit({ maxLines: 3, maxSize: 48 })}>{text}</p>
 *
 * The hook mutates `element.style.fontSize` (and `lineHeight` if set in
 * options) directly — no React re-render per resize frame. Requires
 * React 19+ for the callback-ref cleanup pattern.
 */
export function useFit(options?: UseFitOptions): (node: HTMLElement | null) => void {
  const optsRef = useRef(options);
  optsRef.current = options;

  return useCallback((node: HTMLElement | null) => {
    if (!node) return;

    let handle: FitHandle | null = null;
    let lastText = '';
    let cancelled = false;

    const update = () => {
      if (cancelled) return;
      const opts = optsRef.current ?? {};
      const text = node.textContent ?? '';
      if (text !== lastText) {
        const font = opts.family ?? resolveFont(node);
        handle = prepare(text, font, opts.prepare);
        lastText = text;
      }
      if (!handle) return;
      const width = node.getBoundingClientRect().width;
      if (width <= 0) return;
      const { fontSize } = fit(handle, { ...opts, width });
      node.style.fontSize = `${fontSize}px`;
      if (opts.lineHeight !== undefined) {
        node.style.lineHeight = String(opts.lineHeight);
      }
    };

    const go = async () => {
      await awaitFontsReady();
      update();
    };
    go();

    const ro = new ResizeObserver(update);
    ro.observe(node);
    const mo = new MutationObserver(update);
    mo.observe(node, { childList: true, characterData: true, subtree: true });

    return () => {
      cancelled = true;
      ro.disconnect();
      mo.disconnect();
    };
  }, []);
}

// --- Escape hatch: the explicit-text, React-styled version ---

/**
 * Like `useFit`, but takes the text explicitly and returns `{ ref, style,
 * result }` instead of mutating DOM. Use when you want React to own the
 * styling (e.g., composing with CSS-in-JS) or when you need the
 * `FitResult` for downstream logic.
 */
export function useFitText<E extends HTMLElement = HTMLElement>(
  text: string,
  opts: UseFitTextOptions,
): UseFitTextResult<E> {
  const {
    family,
    prepare: prepareOpts,
    preset,
    height,
    maxLines,
    minSize,
    maxSize,
    lineHeight,
  } = opts;
  const whiteSpace = prepareOpts?.whiteSpace;
  const wordBreak = prepareOpts?.wordBreak;

  const [element, setElement] = useState<E | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [handle, setHandle] = useState<FitHandle | null>(null);

  useEffect(() => {
    if (!element && !family) return;
    let cancelled = false;
    const run = async () => {
      await awaitFontsReady();
      if (cancelled) return;
      const font = family ?? resolveFont(element!);
      setHandle(prepare(text, font, { whiteSpace, wordBreak }));
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [element, text, family, whiteSpace, wordBreak]);

  useIsomorphicLayoutEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  const result = useMemo<FitResult | null>(() => {
    if (!handle || width === null || width <= 0) return preset ?? null;
    return fit(handle, { width, height, maxLines, minSize, maxSize, lineHeight });
  }, [handle, width, preset, height, maxLines, minSize, maxSize, lineHeight]);

  const style = useMemo<CSSProperties | undefined>(
    () =>
      result
        ? {
            fontSize: `${result.fontSize}px`,
            lineHeight: lineHeight ?? DEFAULT_LINE_HEIGHT,
          }
        : undefined,
    [result, lineHeight],
  );

  return { ref: setElement, style, result };
}

// --- Component sugar ---

export type FitTextProps = Omit<HTMLAttributes<HTMLElement>, 'children'> &
  UseFitOptions & {
    as?: keyof HTMLElementTagNameMap;
    children: string;
    /** Static CSS clamp — bypasses the hook entirely, zero JS at runtime. */
    fluid?: FluidFitResult;
    /** Pre-computed result (e.g. from a server loader) to ship as the
     *  initial inline fontSize. The hook takes over after hydration. */
    preset?: FitResult;
  };

export function FitText(props: FitTextProps): ReactElement {
  const {
    as = 'div',
    children,
    fluid,
    preset,
    style: styleProp,
    // Fit options — destructured out so the rest is purely DOM props. TS
    // already knows this split; no runtime key set or casts needed.
    family,
    prepare: prepareOpts,
    height,
    maxLines,
    minSize,
    maxSize,
    lineHeight,
    ...domProps
  } = props;
  const fitRef = useFit({
    family,
    prepare: prepareOpts,
    height,
    maxLines,
    minSize,
    maxSize,
    lineHeight,
  });

  if (fluid) {
    return createElement(
      as,
      { ...domProps, style: { fontSize: fluid.cssClamp, ...styleProp } },
      children,
    );
  }

  const initialStyle: CSSProperties | undefined = preset
    ? { fontSize: `${preset.fontSize}px`, ...styleProp }
    : styleProp;

  return createElement(as, { ...domProps, ref: fitRef, style: initialStyle }, children);
}
