// pages/_app.js
import { OrgProvider } from "../context/OrgContext";

export default function App({ Component, pageProps }) {
  return (
    <OrgProvider>
      <Component {...pageProps} />
    </OrgProvider>
  );
}
