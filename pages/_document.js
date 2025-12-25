// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Primary favicon stack */}
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/brand/favicons/favicon-16.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/brand/favicons/favicon-32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="48x48"
          href="/brand/favicons/favicon-48.png"
        />

        {/* Safari / modern browser mask icon (THIS is the missing piece) */}
        <link
          rel="mask-icon"
          href="/brand/favicons/safari-pinned-tab.svg"
          color="#FFFFFF"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
