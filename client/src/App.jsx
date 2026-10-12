import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AppRoutes from "./AppRoutes";
import LoadingPage from "./pages/LoadingPage";
import { apiUrl } from "./utils/api";
import { setCacheUser, clearCachedFiles } from "./utils/indexedDBUtils";
export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const navigate = useNavigate();
  const verifyToken = useCallback(
    async (redirect = false) => {
      try {
        const { data } = await axios.get(apiUrl("/verifyToken"), {
          withCredentials: true,
          timeout: 15000,
        });
        setCacheUser(data.decoded.user_id);
        setAuthenticated(true);
        if (redirect || window.location.pathname === "/") navigate("/homepage");
      } catch {
        setCacheUser(null);
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );
  async function handleLogout() {
    await axios.post(apiUrl("/logout"), {}, { withCredentials: true });
    try {
      await clearCachedFiles();
    } finally {
      setCacheUser(null);
      setAuthenticated(false);
      navigate("/");
    }
  }
  useEffect(() => {
    verifyToken();
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [verifyToken]);
  if (!online)
    return (
      <div className="loading-page">
        <h1>You’re offline.</h1>
        <p>Reconnect to sign in, mask a file, or recover your data.</p>
        <button className="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  if (loading) return <LoadingPage />;
  return (
    <div className="app-root">
      <AppRoutes
        authenticated={authenticated}
        handleLoginSuccess={() => verifyToken(true)}
        handleLogout={handleLogout}
      />
    </div>
  );
}
