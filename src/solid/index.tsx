/** @jsxImportSource solid-js */
import {
  type Accessor,
  createMemo,
  createSignal,
  getOwner,
  type JSX,
  mergeProps,
  onCleanup,
  runWithOwner,
  Show,
  splitProps,
} from "solid-js";
import {
  DEFAULT_LINE_HEIGHT,
  fit,
  prepare,
  type FitHandle,
  type FitResult,
  type FluidFitResult,
} from "../core";
import {
  awaitFontsReady,
  resolveFont,
  type UseFitOptions,
  type UseFitTextOptions,
  type UseFitTextResult as _UseFitTextResult,
} from "../shared/index";
import { Dynamic } from "solid-js/web";

export { type UseFitOptions, type UseFitTextOptions } from "../shared/index";

export type UseFitTextResult<E extends HTMLElement = HTMLElement> =
  _UseFitTextResult<JSX.CSSProperties, E>;

type MaybeAccessor<T> = T | Accessor<T>;

function access<T>(accessor: MaybeAccessor<T>): T {
  return typeof accessor === "function"
    ? (accessor as Accessor<T>)()
    : accessor;
}

/**
 * Drop a ref on any block-level element and it will fit its text to the
 * container, refitting on resize and on text changes.
 *
 * @example
 *   <h1 ref={useFit()}>Hello</h1>
 *   <p ref={useFit({ maxLines: 3, maxSize: 48 })}>{text}</p>
 *
 * The hook mutates `element.style.fontSize` (and `lineHeight` if set in
 * options) directly.
 */
export function useFit(
  options?: MaybeAccessor<UseFitOptions>,
): (node: HTMLElement | null) => void {
  const owner = getOwner();

  return (node) => {
    if (node === null) {
      return;
    }

    let handle: FitHandle | null = null;
    let lastText = "";
    let raf: number | null = null;

    const update = () => {
      raf = null;

      const opts = access(options) ?? {};
      const text = node.textContent ?? "";

      if (text !== lastText) {
        const font = opts.family ?? resolveFont(node);
        handle = prepare(text, font, opts.prepare);
        lastText = text;
      }

      if (handle === null) {
        return;
      }

      const width = node.getBoundingClientRect().width;

      if (width <= 0) {
        return;
      }

      const { fontSize } = fit(handle, {
        ...opts,
        width,
      });

      node.style.fontSize = `${fontSize}px`;

      if (opts.lineHeight !== undefined) {
        node.style.lineHeight = String(opts.lineHeight);
      }
    };

    const schedule = () => {
      if (raf !== null) {
        return;
      }

      raf = requestAnimationFrame(update);
    };

    void awaitFontsReady().then(schedule);

    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(node);

    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(node, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    if (owner !== null) {
      runWithOwner(owner, () => {
        onCleanup(() => {
          if (raf !== null) {
            cancelAnimationFrame(raf);
            raf = null;
          }

          resizeObserver.disconnect();
          mutationObserver.disconnect();
        });
      });
    }
  };
}

/**
 * Like `useFit`, but takes the text explicitly and returns `{ ref, style,
 * result }` instead of mutating DOM. Use when another renderer owns the
 * styling (e.g. Solid Three) or when you need the `FitResult`.
 */
export function useFitText<E extends HTMLElement = HTMLElement>(
  text: string,
  options: MaybeAccessor<UseFitTextOptions>,
): UseFitTextResult<E> {
  const owner = getOwner();

  const [result, setResult] = createSignal<FitResult | null>(
    access(options).preset ?? null,
  );

  let node: E | null = null;
  let handle: FitHandle | null = null;
  let preparedText = "";
  let preparedFont = "";
  let raf: number | null = null;

  const update = () => {
    raf = null;

    if (node === null) {
      return;
    }

    const width = node.getBoundingClientRect().width;

    if (width <= 0) {
      return;
    }

    const opts = access(options);

    const font = opts.family ?? resolveFont(node);

    if (handle === null || preparedText !== text || preparedFont !== font) {
      handle = prepare(text, font, opts.prepare);
      preparedText = text;
      preparedFont = font;
    }

    setResult(
      fit(handle, {
        width,
        height: opts.height,
        maxLines: opts.maxLines,
        minSize: opts.minSize,
        maxSize: opts.maxSize,
        lineHeight: opts.lineHeight,
      }),
    );
  };

  const schedule = () => {
    if (raf !== null) {
      return;
    }

    raf = requestAnimationFrame(update);
  };

  const ref = (element: E | null) => {
    if (element === null) {
      return;
    }

    node = element;

    void awaitFontsReady().then(schedule);

    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(element);

    if (owner !== null) {
      runWithOwner(owner, () => {
        onCleanup(() => {
          if (raf !== null) {
            cancelAnimationFrame(raf);
            raf = null;
          }

          resizeObserver.disconnect();
        });
      });
    }
  };

  const style = createMemo<JSX.CSSProperties | undefined>(() => {
    const value = result();

    if (value === null) {
      return undefined;
    }

    return {
      fontSize: `${value.fontSize}px`,
      lineHeight: String(access(options).lineHeight ?? DEFAULT_LINE_HEIGHT),
    };
  });

  return {
    ref,
    style: style(),
    result: result(),
  };
}

export type FitTextProps = Omit<
  JSX.HTMLAttributes<HTMLElement>,
  "children" | "style"
> &
  UseFitOptions & {
    as?: keyof HTMLElementTagNameMap;
    children: string;
    /** Static CSS clamp — bypasses the hook entirely, zero JS at runtime. */
    fluid?: FluidFitResult;
    /** Pre-computed result (e.g. from a server loader) to ship as the
     *  initial inline fontSize. The hook takes over after hydration. */
    preset?: FitResult;
    style?: JSX.CSSProperties;
  };

export function FitText(props: FitTextProps) {
  const defaultProps = mergeProps(props, { as: "div" });
  const [local, domProps] = splitProps(defaultProps, [
    "as",
    "fluid",
    "preset",
    "style",
    "family",
    "prepare",
    "height",
    "maxLines",
    "minSize",
    "maxSize",
    "lineHeight",
  ]);


  const Fallback = () => {
    const fitRef = useFit(() => ({
      family: local.family,
      prepare: local.prepare,
      height: local.height,
      maxLines: local.maxLines,
      minSize: local.minSize,
      maxSize: local.maxSize,
      lineHeight: local.lineHeight,
    }));

    const initialStyle: Accessor<JSX.CSSProperties | undefined> = () => local.preset
      ? { "font-size": `${local.preset.fontSize}px`, ...local.style }
      : local.style;

    return <Dynamic component={local.as} {...domProps} ref={fitRef} style={initialStyle} />
  }

  return (
    <Show
      when={local.fluid}
      fallback={<Fallback />}
    >
      {(fluid) => (
        <Dynamic
          component={local.as}
          {...domProps}
          style={{
            "font-size": fluid().cssClamp,
            ...local.style,
          }}
        />
      )}
    </Show>
  );
}
