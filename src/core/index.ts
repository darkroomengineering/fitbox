// Public barrel for the framework-agnostic core. Implementations live in
// focused modules so consumers (notably the React adapter) only bundle what
// they reference — `layout.ts` and its Pretext `layoutWithLines` import drop
// out of any build that never calls `layoutFit`. `clamp`/`round` stay
// internal to `fit.ts` and are intentionally not re-exported here.
export {
  DEFAULT_LINE_HEIGHT,
  type FitHandle,
  type FitOptions,
  type FitResult,
  fit,
  type PrepareOptions,
  prepare,
} from './fit.js';
export {
  type FluidFitMultiLineOptions,
  type FluidFitMultiLineResult,
  type FluidFitOptions,
  type FluidFitResult,
  type FluidFitSegment,
  fluidFit,
  fluidFitMultiLine,
} from './fluid.js';
export { type LayoutFitLine, type LayoutFitResult, layoutFit } from './layout.js';
