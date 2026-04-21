import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import '../styles/app.css';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>fitbox — reflow-free text-to-box fitting for React</title>
        <meta
          name="description"
          content="Reflow-free text fitting for React, built on @chenglou/pretext. Static clamp() CSS, SSR, WebGL — all without measuring the DOM."
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}
