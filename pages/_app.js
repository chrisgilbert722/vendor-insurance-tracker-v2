// pages/_app.js
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { useState } from "react";

export default function App({ Component, pageProps }) {
  const [supabaseClient] = useState(() =>
    createBrowserSupabaseClient()
  );

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <OrgProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </OrgProvider>
    </SessionContextProvider>
  );
}
