import { Text } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useState, type ReactNode } from 'react';
import { fluidFit, layoutFit, prepare } from '@darkroomengineering/fitbox';
import { FitText, useFit } from '@darkroomengineering/fitbox/react';

function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? children : fallback;
}

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Hero />
      <Why />
      <Demos />
      <Install />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <section className="border-b border-[var(--color-line)] pb-24">
      {/* Hero uses a static CSS clamp — SSR-safe, zero JS, zero CLS.
          Equivalent to what fluidFit would emit for 'fitbox' at system-ui. */}
      <h1
        style={{
          margin: 0,
          fontWeight: 700,
          letterSpacing: '-0.04em',
          lineHeight: 0.9,
          fontSize: 'clamp(72px, 32vw, 360px)',
        }}
      >
        fitbox
      </h1>
      <p className="mt-8 max-w-2xl text-xl leading-relaxed text-[var(--color-muted)]">
        Reflow-free text-to-box fitting for React. Built on{' '}
        <a href="https://github.com/chenglou/pretext">@chenglou/pretext</a>.
      </p>
      <div className="mt-6 flex gap-6 text-sm text-[var(--color-muted)]">
        <a href="https://github.com/darkroomengineering/fitbox">GitHub</a>
        <a href="https://www.npmjs.com/package/@darkroomengineering/fitbox">npm</a>
        <a href="#why">Why</a>
        <a href="#demos">Demos</a>
        <a href="#install">Install</a>
      </div>
    </section>
  );
}

function Why() {
  return (
    <section id="why" className="border-b border-[var(--color-line)] py-24">
      <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
        Why
      </h2>
      <div className="mt-6 max-w-3xl space-y-6 text-lg leading-relaxed">
        <p>
          Libraries like <a href="https://github.com/rikschennink/fitty">Fitty</a>{' '}
          fit text to a container by measuring the DOM — put the text in, read{' '}
          <code>getBoundingClientRect</code>, adjust, repeat. Every read forces the
          browser to reflow the page. Twenty headings on a resizing window means
          thousands of reflows per second.
        </p>
        <p>
          <a href="https://github.com/chenglou/pretext">Pretext</a> measures text
          through <code>canvas.measureText</code>, which doesn't reflow. With
          per-glyph widths cached, measuring a wrapped paragraph is microseconds of
          arithmetic.
        </p>
        <p>
          When measurement stops touching layout, the algorithm collapses. Single-line
          fit becomes a closed form (<code>fontSize = width / naturalWidth</code>).
          Multi-line fit becomes a binary search over pure arithmetic. Responsive fit
          becomes a static <code>clamp()</code> CSS string — zero JavaScript at
          runtime. And because nothing depends on the DOM, the fit works equally well
          in SSR, in Canvas, in WebGL, in SVG.
        </p>
      </div>
    </section>
  );
}

function Demos() {
  return (
    <section
      id="demos"
      className="space-y-20 border-b border-[var(--color-line)] py-24"
    >
      <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
        Demos
      </h2>

      <SingleLineDemo />
      <MultiLineDemo />
      <ClientOnly fallback={<DemoFrame title="Fluid CSS clamp — zero JS at runtime" description="Loading…" code="">{null}</DemoFrame>}>
        <FluidDemo />
      </ClientOnly>
      <ClientOnly fallback={<DemoFrame title="Beyond the DOM — WebGL" description="Loading…" code="">{null}</DemoFrame>}>
        <WebGLDemo />
      </ClientOnly>
    </section>
  );
}

function DemoFrame({
  title,
  description,
  children,
  code,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  code: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="max-w-2xl text-sm text-[var(--color-muted)]">{description}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-[var(--color-line)]">
        {children}
      </div>
      <pre className="overflow-x-auto rounded-lg border border-[var(--color-line)] bg-black/40 p-4 text-xs leading-relaxed text-[var(--color-muted)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const EDITABLE_STYLE: React.CSSProperties = {
  margin: 0,
  outline: 'none',
  cursor: 'text',
};

function SingleLineDemo() {
  return (
    <DemoFrame
      title="Single-line fit"
      description="Drag the right edge to resize. Click the text to edit it — fitbox refits on every keystroke via MutationObserver."
      code={`<h1 ref={useFit({ maxSize: 200 })} contentEditable>
  Hello World
</h1>`}
    >
      <div
        className="resize-x overflow-hidden p-6"
        style={{ minWidth: 160, width: 480 }}
      >
        <h1
          ref={useFit({ maxSize: 200 })}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          style={EDITABLE_STYLE}
        >
          Hello World
        </h1>
      </div>
    </DemoFrame>
  );
}

function MultiLineDemo() {
  const text =
    'Typography that actually fits its container, without layout thrashing or binary searches over the DOM.';
  return (
    <DemoFrame
      title="Multi-line fit"
      description="maxLines: 3. Click to edit — wrap points, line count, and fontSize all reflow. Still pure arithmetic, no DOM measurement."
      code={`<p ref={useFit({ maxLines: 3, maxSize: 48 })} contentEditable>
  {text}
</p>`}
    >
      <div
        className="flex resize-x items-center overflow-hidden p-6"
        style={{ minWidth: 200, width: 640, minHeight: 160 }}
      >
        <p
          ref={useFit({ maxLines: 3, maxSize: 48, lineHeight: 1.2 })}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          style={EDITABLE_STYLE}
        >
          {text}
        </p>
      </div>
    </DemoFrame>
  );
}

function FluidDemo() {
  // Static: computed on the server (or once on the client), shipped as a CSS string.
  const fluid = fluidFit(prepare('fluid typography', 'system-ui'), {
    minViewport: 360,
    maxViewport: 1440,
    minSize: 28,
    maxSize: 120,
  });
  return (
    <DemoFrame
      title="Fluid CSS clamp — zero JS at runtime"
      description="The browser interpolates this clamp() natively. Resize the window and watch it move."
      code={`fluidFit(prepare('fluid typography'), {
  minViewport: 360, maxViewport: 1440, minSize: 28, maxSize: 120,
})
// → ${fluid.cssClamp}`}
    >
      <div className="p-6">
        <FitText
          as="h3"
          fluid={fluid}
          style={{
            margin: 0,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            lineHeight: 0.95,
          }}
        >
          fluid typography
        </FitText>
      </div>
    </DemoFrame>
  );
}

function WebGLDemo() {
  const [handle] = useState(() =>
    prepare('fit to a texture, not the DOM', 'system-ui'),
  );
  const width = 720;
  const layout = layoutFit(handle, {
    width,
    maxLines: 2,
    maxSize: 72,
    lineHeight: 1.15,
  });
  return (
    <DemoFrame
      title="Beyond the DOM — WebGL"
      description="layoutFit returns per-line positions. Each line is a drei <Text> mesh, positioned by fitbox — no DOM, works under WebGL or WebGPU."
      code={`layoutFit(handle, { width: 720, maxLines: 2, maxSize: 72 })
// → { fontSize, lines: [{ text, width, y }] }`}
    >
      <div className="h-[320px] w-full bg-black">
        <Canvas
          orthographic
          camera={{ position: [0, 0, 100], zoom: 1, near: 0.1, far: 1000 }}
        >
          <color attach="background" args={['#050505']} />
          {layout.lines.map((line, i) => (
            <Text
              key={i}
              fontSize={layout.fontSize}
              anchorX="left"
              anchorY="top"
              color="#fafafa"
              position={[-width / 2, layout.height / 2 - line.y, 0]}
            >
              {line.text}
            </Text>
          ))}
        </Canvas>
      </div>
    </DemoFrame>
  );
}

function Install() {
  return (
    <section id="install" className="border-b border-[var(--color-line)] py-24">
      <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
        Install
      </h2>
      <pre className="mt-6 overflow-x-auto rounded-lg border border-[var(--color-line)] bg-black/40 p-4 text-sm">
        <code>bun add @darkroomengineering/fitbox</code>
      </pre>
      <p className="mt-6 max-w-2xl text-sm text-[var(--color-muted)]">
        Pretext ships as a dependency; no peer-install friction. For SSR, add{' '}
        <code>@napi-rs/canvas</code> and call <code>configureServerCanvas()</code>{' '}
        once at startup. Full API reference on{' '}
        <a href="https://github.com/darkroomengineering/fitbox#api">GitHub</a>.
      </p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="flex flex-col gap-2 py-16 text-sm text-[var(--color-muted)] md:flex-row md:justify-between">
      <div>
        Built by <a href="https://darkroom.engineering">darkroom.engineering</a>.
        MIT licensed.
      </div>
      <div className="flex gap-6">
        <a href="https://github.com/darkroomengineering/fitbox">GitHub</a>
        <a href="https://www.npmjs.com/package/@darkroomengineering/fitbox">npm</a>
        <a href="https://github.com/chenglou/pretext">Pretext</a>
      </div>
    </footer>
  );
}
