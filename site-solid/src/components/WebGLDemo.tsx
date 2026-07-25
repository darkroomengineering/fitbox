// TODO...
/** @jsxImportSource solid-js */
// import { FitHandle, layoutFit, prepare } from "@darkroomengineering/fitbox";
// import { Canvas, For, useFrame, useThree } from "solid-three";
// import { Text } from "@bigmistqke/solid-drei/import";
// import DemoFrame from "./DemoFrame";

// type MaybeAccess<T extends (...args: any) => any> = Parameters<T>[0];

// /** @jsxImportSource solid-js */
// export default function WebGLDemo() {
//   const handle = prepare(
//     "typography that renders into a texture, not the DOM",
//     "system-ui",
//   );
//   return (
//     <DemoFrame
//       title="Beyond the DOM — WebGL"
//       description="layoutFit reads the live canvas width via useThree() and refits on resize. Each line is a drei <Text> mesh with a neon outline, animated per-line via useFrame — impossible with pure CSS, free with layoutFit."
//       code={`const { size } = useThree()
//   const layout = layoutFit(handle, { width: size.width, maxLines: 2, maxSize: 64 })
//   useFrame(({ clock }) => group.current.children.forEach((child, i) => {
//     child.position.y = baseY[i] + Math.sin(clock.elapsedTime * 1.4 + i * 0.9) * 6
//   }))`}
//     >
//       <div class="h-[320px] w-full bg-black">
//         <Canvas
//           orthographic
//           camera={{ position: [0, 0, 100], zoom: 1, near: 0.1, far: 1000 }}
//           dpr={[1, 2]}
//           gl={{ antialias: true }}
//         >
//           <color attach="background" args={["#050505"]} />
//           <FittedText handle={handle} />
//         </Canvas>
//       </div>
//     </DemoFrame>
//   );
// }

// function FittedText(props: { handle: FitHandle }) {
//   const three = useThree();
//   let group: any = null!;
//   const layout = () =>
//     layoutFit(props.handle, {
//       width: three().size.width,
//       maxLines: 2,
//       maxSize: 64,
//       lineHeight: 1.1,
//     });

//   useFrame(({ clock }) => {
//     if (!group) return;
//     const _layout = layout();
//     const t = clock.elapsedTime;
//     for (let i = 0; i < group.children.length; i++) {
//       const child = group.children[i];
//       const base = _layout.height / 2 - (_layout.lines[i]?.y ?? 0);
//       if (child) child.position.y = base + Math.sin(t * 1.4 + i * 0.9) * 6;
//     }
//   });

//   return (
//     <group ref={(g) => (group = g)}>
//       <For each={layout().lines}>
//         {(line) => (
//           <Text
//             fontSize={layout().fontSize}
//             anchorX="left"
//             anchorY="top"
//             color="#fafafa"
//             sdfGlyphSize={256}
//             outlineWidth={0}
//             outlineColor="#7cf"
//             outlineOpacity={0.6}
//             outlineBlur={layout().fontSize * 0.08}
//             position={[
//               -three().size.width / 2,
//               layout().height / 2 - line.y,
//               0,
//             ]}
//           >
//             {line.text}
//           </Text>
//         )}
//       </For>
//     </group>
//   );
// }
