/** @jsxImportSource solid-js */
import DemoFrame from "./DemoFrame";
import { FitText } from "@darkroomengineering/fitbox/solid";
import { fluidFit, prepare } from "@darkroomengineering/fitbox";

export default function FluidDemo() {
  // Static: computed on the server (or once on the client), shipped as a CSS string.
  const fluid = fluidFit(prepare("fluid typography", "system-ui"), {
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
      <div class="p-6">
        <FitText
          as="h3"
          fluid={fluid}
          style={{
            margin: 0,
            "font-weight": 600,
            "letter-spacing": "-0.02em",
            "line-height": 0.95,
          }}
        >
          fluid typography
        </FitText>
      </div>
    </DemoFrame>
  );
}
