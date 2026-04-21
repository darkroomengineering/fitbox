import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';

export default function Root() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>fitbox playground</title>
        <Meta />
        <Links />
        <style>{`
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: system-ui, sans-serif;
            background: #0a0a0a;
            color: #fafafa;
            padding: 24px;
          }
          h2 { margin: 48px 0 8px; opacity: 0.6; font-weight: 500; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
          .box { border: 1px solid #2a2a2a; padding: 24px; border-radius: 8px; margin-bottom: 8px; }
          .resize { resize: horizontal; overflow: hidden; min-width: 100px; max-width: 100%; }
          .note { font-size: 12px; opacity: 0.5; margin-top: 8px; }
          a { color: #9cf; }
        `}</style>
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
