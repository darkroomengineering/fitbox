import { useLoaderData } from 'react-router';
import { fluidFit, prepare } from 'fitbox';
import { FitText, useFitText } from 'fitbox/react';

const FAMILY = 'system-ui, sans-serif';

// Client loader — runs after hydration, has window.document for canvas.
// We compute fluid CSS here rather than server-side to avoid needing a
// Node canvas polyfill for the playground.
export async function clientLoader() {
  const handle = prepare('Fitbox', FAMILY);
  const fluid = fluidFit(handle, {
    minViewport: 320,
    maxViewport: 1440,
    minSize: 24,
    maxSize: 180,
  });
  return { fluid };
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <p style={{ opacity: 0.5 }}>Measuring…</p>;
}

export default function Home() {
  const { fluid } = useLoaderData<typeof clientLoader>();

  return (
    <main>
      <h1 style={{ margin: 0 }}>fitbox demo</h1>
      <p className="note">
        Reflow-free text fitting built on{' '}
        <a href="https://github.com/chenglou/pretext">@chenglou/pretext</a>. Drag the
        right edge of each box to resize.
      </p>

      <h2>Single-line fit (useFitText)</h2>
      <SingleLineDemo />

      <h2>Multi-line fit (maxLines: 3)</h2>
      <MultiLineDemo />

      <h2>Fluid CSS clamp — no JS at runtime</h2>
      <FluidDemo fluid={fluid} />

      <h2>Preset (loader-computed, no client measurement)</h2>
      <PresetDemo />
    </main>
  );
}

function SingleLineDemo() {
  return (
    <div className="box resize" style={{ width: 480 }}>
      <FitText family={FAMILY} maxSize={200}>
        Hello World
      </FitText>
    </div>
  );
}

function MultiLineDemo() {
  const text =
    'Typography that actually fits its container, without layout thrashing or binary searches over the DOM.';
  const { ref, style } = useFitText<HTMLParagraphElement>(text, {
    family: FAMILY,
    maxLines: 3,
    maxSize: 48,
    lineHeight: 1.15,
  });
  return (
    <div
      className="box resize"
      style={{ width: 640, minHeight: 100, display: 'flex', alignItems: 'center' }}
    >
      <p ref={ref} style={{ margin: 0, ...style }}>
        {text}
      </p>
    </div>
  );
}

function FluidDemo({ fluid }: { fluid: ReturnType<typeof fluidFit> }) {
  return (
    <>
      <div className="box">
        <FitText family={FAMILY} fluid={fluid} as="h3" style={{ margin: 0 }}>
          Fitbox
        </FitText>
      </div>
      <p className="note">
        <code>{fluid.cssClamp}</code>
      </p>
    </>
  );
}

function PresetDemo() {
  // In a real SSR setup this would come from a server loader using
  // fitbox/server. Here we fake a preset to demo the API.
  const preset = { fontSize: 72, lineCount: 1, height: 72 * 1.2 };
  return (
    <div className="box">
      <FitText family={FAMILY} preset={preset} as="h3" style={{ margin: 0 }}>
        Preset from loader
      </FitText>
      <p className="note">
        fontSize = {preset.fontSize}px, shipped by server; no client measurement.
      </p>
    </div>
  );
}
