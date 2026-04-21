import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  createElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  DEFAULT_LINE_HEIGHT,
  fit,
  type FitHandle,
  type FitOptions,
  type FitResult,
  type FluidFitResult,
  prepare,
  type PrepareOptions,
} from '../core/index.js';

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

export type UseFitTextOptions = Omit<FitOptions, 'width'> & {
  family: string;
  prepare?: PrepareOptions;
  preset?: FitResult;
};

export type UseFitTextResult<E extends HTMLElement = HTMLElement> = {
  ref: (node: E | null) => void;
  style: CSSProperties | undefined;
  result: FitResult | null;
};

export function useFitText<E extends HTMLElement = HTMLElement>(
  text: string,
  opts: UseFitTextOptions,
): UseFitTextResult<E> {
  const { family, prepare: prepareOpts, preset, ...fitOpts } = opts;
  const whiteSpace = prepareOpts?.whiteSpace;
  const wordBreak = prepareOpts?.wordBreak;

  const [element, setElement] = useState<E | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [handle, setHandle] = useState<FitHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (typeof document !== 'undefined' && document.fonts?.status !== 'loaded') {
        try {
          await document.fonts.ready;
        } catch {
          // proceed with whatever font is currently available
        }
      }
      if (cancelled) return;
      setHandle(prepare(text, family, { whiteSpace, wordBreak }));
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [text, family, whiteSpace, wordBreak]);

  useIsomorphicLayoutEffect(() => {
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  const result = useMemo<FitResult | null>(() => {
    if (!handle || width === null || width <= 0) return preset ?? null;
    return fit(handle, { ...fitOpts, width });
  }, [handle, width, preset, fitOpts]);

  const style = useMemo<CSSProperties | undefined>(
    () =>
      result
        ? {
            fontSize: `${result.fontSize}px`,
            lineHeight: fitOpts.lineHeight ?? DEFAULT_LINE_HEIGHT,
          }
        : undefined,
    [result, fitOpts.lineHeight],
  );

  return { ref: setElement, style, result };
}

export type FitTextProps = Omit<HTMLAttributes<HTMLElement>, 'children'> &
  UseFitTextOptions & {
    as?: keyof HTMLElementTagNameMap;
    children: string;
    fluid?: FluidFitResult;
  };

const FIT_OPTION_KEYS: ReadonlySet<keyof UseFitTextOptions> = new Set([
  'family',
  'prepare',
  'preset',
  'height',
  'maxLines',
  'minSize',
  'maxSize',
  'lineHeight',
]);

export function FitText(props: FitTextProps): ReactElement {
  const { as = 'span', children, fluid, style: styleProp, ...rest } = props;

  const fitOpts = {} as UseFitTextOptions;
  const domProps: Record<string, unknown> = {};
  for (const key in rest) {
    if (FIT_OPTION_KEYS.has(key as keyof UseFitTextOptions)) {
      (fitOpts as Record<string, unknown>)[key] = (rest as Record<string, unknown>)[key];
    } else {
      domProps[key] = (rest as Record<string, unknown>)[key];
    }
  }

  const hook = useFitText(children, fitOpts);

  const mergedStyle: CSSProperties = {
    ...(fluid ? { fontSize: fluid.cssClamp } : hook.style),
    ...styleProp,
  };

  return createElement(
    as,
    { ...domProps, ref: fluid ? undefined : hook.ref, style: mergedStyle },
    children,
  );
}
