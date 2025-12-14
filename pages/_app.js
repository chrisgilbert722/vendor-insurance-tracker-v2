// pages/_app.js
import "../public/cockpit.css";
import { UserProvider } from "../context/UserContext";

export default function App({ Component, pageProps }) {
  return (
    <UserProvider>
      <Component {...pageProps} />
    </UserProvider>
  );
}
