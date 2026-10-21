// Web-only root HTML. Makes "Add to Home Screen" open Kardza full-screen (PWA manifest + iOS meta tags).
// headNodes/bodyNodes carry Expo's own metadata, font preloads and the JS bundle: they must stay.
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>Kardza</title>
        <meta name="description" content="A trading-card marketplace that adapts to every age and country." />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A0A0F" />
        <link rel="icon" type="image/png" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Kardza" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html, body { background-color: #0A0A0F; }' }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
