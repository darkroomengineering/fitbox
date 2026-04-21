import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('webgl', 'routes/webgl.tsx'),
] satisfies RouteConfig;
