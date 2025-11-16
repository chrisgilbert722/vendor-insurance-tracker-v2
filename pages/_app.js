// pages/_app.js
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";

export default function App({ Component, pageProps }) {
  return (
    <OrgProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </OrgProvider>
  );
}
