import PropTypes from "prop-types";
import Recover from "./pages/Recover";
import { TaskProvider } from "./components/TaskContext";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  About,
  ContactUs,
  Home,
  Login,
  Data,
  FileDisplay,
  Setting,
} from "./pages";

const AppRoutes = ({ authenticated, handleLoginSuccess, handleLogout }) => {
  return (
    <TaskProvider key={authenticated ? "signed-in" : "signed-out"}>
      <Routes>
        {authenticated ? (
          <>
            <Route path="/recover" element={<Recover />} />
            <Route
              path="/homepage"
              element={<Home onLogout={handleLogout} />}
            />
            <Route
              path="/about-us"
              element={<About onLogout={handleLogout} />}
            />
            <Route
              path="/contact"
              element={<ContactUs onLogout={handleLogout} />}
            />
            <Route path="/folder" element={<Data onLogout={handleLogout} />} />
            <Route
              path="/display"
              element={<FileDisplay onLogout={handleLogout} />}
            />
            <Route
              path="/setting"
              element={<Setting onLogout={handleLogout} />}
            />
          </>
        ) : (
          <>
            <Route
              path="/"
              element={<Login onLoginSuccess={handleLoginSuccess} />}
            />
            <Route path="/register" element={<Navigate to="/" replace />} />
            <Route
              path="/forgot-password"
              element={<Navigate to="/" replace />}
            />
          </>
        )}
        <Route
          path="*"
          element={<Navigate to={authenticated ? "/homepage" : "/"} replace />}
        />
      </Routes>
    </TaskProvider>
  );
};

export default AppRoutes;

AppRoutes.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  handleLoginSuccess: PropTypes.func.isRequired,
  handleLogout: PropTypes.func.isRequired,
};
