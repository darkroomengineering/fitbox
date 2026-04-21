import {
  type FitOptions,
  type FitResult,
  type FluidFitOptions,
  type FluidFitResult,
  fit,
  fluidFit,
  prepare,
  type PrepareOptions,
} from '../core/index.js';

type CanvasLike = {
  getContext(type: '2d'): {
    measureText(text: string): { width: number; [k: string]: unknown };
    font?: string;
    [k: string]: unknown;
  } | null;
};

type DocumentShim = { createElement(tag: 'canvas'): CanvasLike };

const DEFAULT_CACHE_MAX = 1024;

class LRU<V> {
  readonly #store = new Map<string, V>();
  #max: number;

  constructor(max: number) {
    this.#max = max;
  }

  get(key: string): V | undefined {
    const value = this.#store.get(key);
    if (value === undefined) return undefined;
    // move to most-recently-used position
    this.#store.delete(key);
    this.#store.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    if (this.#store.has(key)) this.#store.delete(key);
    this.#store.set(key, value);
    if (this.#store.size > this.#max) {
      const oldest = this.#store.keys().next().value;
      if (oldest !== undefined) this.#store.delete(oldest);
    }
  }

  clear(): void {
    this.#store.clear();
  }

  resize(max: number): void {
    this.#max = max;
    while (this.#store.size > max) {
      const oldest = this.#store.keys().next().value;
      if (oldest === undefined) break;
      this.#store.delete(oldest);
    }
  }
}

const fitCache = new LRU<FitResult>(DEFAULT_CACHE_MAX);
const fluidCache = new LRU<FluidFitResult>(DEFAULT_CACHE_MAX);

export type ConfigureServerCanvasOptions = {
  /** Maximum cache entries per LRU (fit, fluid). Default 1024. */
  cacheMax?: number;
};

/**
 * Install a canvas factory on globalThis.document so @chenglou/pretext's
 * internal measurement path works on Node. Call once at server startup.
 *
 * Example:
 *   import { createCanvas } from '@napi-rs/canvas';
 *   configureServerCanvas(() => createCanvas(1, 1));
 */
export function configureServerCanvas(
  factory: () => CanvasLike,
  options?: ConfigureServerCanvasOptions,
): void {
  const g = globalThis as { document?: DocumentShim };
  if (!g.document) g.document = { createElement: () => factory() };
  if (options?.cacheMax !== undefined) {
    fitCache.resize(options.cacheMax);
    fluidCache.resize(options.cacheMax);
  }
}

export function fitCached(
  text: string,
  family: string,
  fitOpts: FitOptions,
  prepareOpts?: PrepareOptions,
): FitResult {
  const key = JSON.stringify([text, family, fitOpts, prepareOpts ?? null]);
  const cached = fitCache.get(key);
  if (cached) return cached;
  const result = fit(prepare(text, family, prepareOpts), fitOpts);
  fitCache.set(key, result);
  return result;
}

export function fluidFitCached(
  text: string,
  family: string,
  fluidOpts: FluidFitOptions,
  prepareOpts?: PrepareOptions,
): FluidFitResult {
  const key = JSON.stringify([text, family, fluidOpts, prepareOpts ?? null]);
  const cached = fluidCache.get(key);
  if (cached) return cached;
  const result = fluidFit(prepare(text, family, prepareOpts), fluidOpts);
  fluidCache.set(key, result);
  return result;
}

export function clearServerCache(): void {
  fitCache.clear();
  fluidCache.clear();
}

export * from '../core/index.js';
