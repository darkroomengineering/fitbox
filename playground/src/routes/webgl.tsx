import { Text } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { PlaneGeometry } from 'three';
import { layoutFit, prepare } from 'fitbox';

const FAMILY = 'system-ui, sans-serif';
const TEXT =
  'Typography that renders to a texture, not the DOM — fit computed by fitbox.';

export async function clientLoader() {
  return { ready: true };
}
clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <p style={{ opacity: 0.5 }}>Booting WebGL…</p>;
}

export default function WebGLRoute() {
  const [width, setWidth] = useState(800);

  // Prepare once per text; handle is cheap to keep in state.
  const handle = useMemo(() => prepare(TEXT, FAMILY), []);

  const layout = useMemo(
    () => layoutFit(handle, { width, maxLines: 3, lineHeight: 1.2, maxSize: 80 }),
    [handle, width],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/" style={{ color: '#9cf' }}>
          ← back to DOM demo
        </Link>
        <h1 style={{ margin: 0 }}>webgl demo</h1>
      </div>

      <p className="note" style={{ maxWidth: 720 }}>
        Same fit algorithm, rendered through <code>@react-three/drei</code>'s{' '}
        <code>&lt;Text&gt;</code>. Each line is its own mesh positioned using
        fitbox's <code>layoutFit</code> output — no DOM, no reflow, works
        identically under Three's WebGL or WebGPU renderer.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label htmlFor="w" style={{ minWidth: 140 }}>
          Container width: {Math.round(width)}px
        </label>
        <input
          id="w"
          type="range"
          min={200}
          max={1200}
          step={10}
          value={width}
          onChange={(e) => setWidth(Number(e.currentTarget.value))}
          style={{ flex: 1 }}
        />
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 420,
          border: '1px solid #2a2a2a',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#050505',
        }}
      >
        <Canvas
          orthographic
          camera={{ position: [0, 0, 100], zoom: 1, near: 0.1, far: 1000 }}
        >
          <color attach="background" args={['#050505']} />
          <group>
            {/* Debug frame so you can see the "container" in world space */}
            <lineSegments>
              <edgesGeometry args={[new PlaneGeometry(width, layout.height)]} />
              <lineBasicMaterial color="#2a2a2a" />
            </lineSegments>
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
          </group>
        </Canvas>
      </div>

      <p className="note">
        <code>
          layoutFit(handle, {'{'} width: {Math.round(width)}, maxLines: 3{'}'})
        </code>{' '}
        → fontSize {layout.fontSize.toFixed(1)}px, {layout.lines.length} line
        {layout.lines.length === 1 ? '' : 's'}.
      </p>
    </div>
  );
}
