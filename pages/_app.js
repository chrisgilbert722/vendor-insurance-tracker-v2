// pages/_app.js
import "../public/cockpit.css";
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";
import { UserProvider } from "../context/UserContext";

export default function App({ Component, pageProps }) {
  return (
    <UserProvider>
      <OrgProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </OrgProvider>
    </UserProvider>
  );
}
