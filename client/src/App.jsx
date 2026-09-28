import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import LoadingPage from './pages/LoadingPage';
import { apiUrl } from './utils/api';
import { setCacheUser } from './utils/indexedDBUtils';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const verifyToken = async (redirect = false) => {
    try {
      const { data } = await axios.get(apiUrl('/verifyToken'), { withCredentials: true });
      setCacheUser(data.decoded.user_id);
      setAuthenticated(true);
      if (redirect || window.location.pathname === '/') navigate('/homepage');
    } catch {
      setCacheUser(null);
      setAuthenticated(false);
    } finally { setLoading(false); }
  };
  const handleLogout = async () => {
    try { await axios.post(apiUrl('/logout'), {}, { withCredentials: true }); }
    finally {
      setCacheUser(null);
      setAuthenticated(false);
      navigate('/');
    }
  };
  useEffect(() => { verifyToken(); }, []);
  if (loading) return <LoadingPage />;
  return <div className="bg-primary h-screen overflow-hidden flex">
    <AppRoutes authenticated={authenticated} handleLoginSuccess={() => verifyToken(true)} handleLogout={handleLogout} />
  </div>;
}
