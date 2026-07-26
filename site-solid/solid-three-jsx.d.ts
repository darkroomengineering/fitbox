import { JSX } from "solid-js";
import * as THREE from "three";

// Map ThreeJS elements to their corresponding types for Solid's JSX engine
type ThreeIntrinsicElements = {
  mesh: JSX.HTMLAttributes<THREE.Mesh> & { position?: any; rotation?: any; scale?: any };
  boxGeometry: JSX.HTMLAttributes<THREE.BoxGeometry> & { args?: any };
  meshStandardMaterial: JSX.HTMLAttributes<THREE.MeshStandardMaterial> & { color?: any };
  ambientLight: JSX.HTMLAttributes<THREE.AmbientLight> & { intensity?: any };
  directionalLight: JSX.HTMLAttributes<THREE.DirectionalLight> & { position?: any; intensity?: any };
  orbitControls: any;
  group: JSX.HTMLAttributes<THREE.Group> & { position?: any; rotation?: any };
};

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements extends ThreeIntrinsicElements {}
  }
}
