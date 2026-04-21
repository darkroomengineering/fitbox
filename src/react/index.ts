import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  createElement,
  useEffect,
  useLayoutEffect,
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
      if (document.fonts.status !== 'loaded') await document.fonts.ready;
      if (cancelled) return;
      setHandle(prepare(text, family, { whiteSpace, wordBreak }));
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [text, family, whiteSpace, wordBreak]);

  useIsomorphicLayoutEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  const result =
    handle && width !== null && width > 0
      ? fit(handle, { ...fitOpts, width })
      : (preset ?? null);

  const style: CSSProperties | undefined = result
    ? {
        fontSize: `${result.fontSize}px`,
        lineHeight: fitOpts.lineHeight ?? DEFAULT_LINE_HEIGHT,
      }
    : undefined;

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

function splitProps(
  rest: Record<string, unknown>,
): { fitOpts: UseFitTextOptions; domProps: Record<string, unknown> } {
  const fitOpts = {} as UseFitTextOptions;
  const domProps: Record<string, unknown> = {};
  for (const key in rest) {
    if (FIT_OPTION_KEYS.has(key as keyof UseFitTextOptions)) {
      (fitOpts as Record<string, unknown>)[key] = rest[key];
    } else {
      domProps[key] = rest[key];
    }
  }
  return { fitOpts, domProps };
}

/**
 * When `fluid` is provided, skip the measurement hook entirely — the browser
 * interpolates `clamp()` natively, so we only need to render a plain element.
 * No ResizeObserver, no prepare, no canvas.
 */
function FluidFitText({
  as,
  children,
  fluid,
  styleProp,
  domProps,
}: {
  as: keyof HTMLElementTagNameMap;
  children: string;
  fluid: FluidFitResult;
  styleProp: CSSProperties | undefined;
  domProps: Record<string, unknown>;
}): ReactElement {
  const style: CSSProperties = { fontSize: fluid.cssClamp, ...styleProp };
  return createElement(as, { ...domProps, style }, children);
}

function DynamicFitText({
  as,
  children,
  fitOpts,
  styleProp,
  domProps,
}: {
  as: keyof HTMLElementTagNameMap;
  children: string;
  fitOpts: UseFitTextOptions;
  styleProp: CSSProperties | undefined;
  domProps: Record<string, unknown>;
}): ReactElement {
  const hook = useFitText(children, fitOpts);
  const style: CSSProperties = { ...hook.style, ...styleProp };
  return createElement(as, { ...domProps, ref: hook.ref, style }, children);
}

export function FitText(props: FitTextProps): ReactElement {
  const { as = 'div', children, fluid, style: styleProp, ...rest } = props;
  const { fitOpts, domProps } = splitProps(rest as Record<string, unknown>);

  return fluid
    ? createElement(FluidFitText, { as, children, fluid, styleProp, domProps })
    : createElement(DynamicFitText, { as, children, fitOpts, styleProp, domProps });
}
