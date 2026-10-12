import ReactDOM from "react-dom/client";
import { StrictMode } from "react";
import App from "./App.jsx";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./index.css";
import { PwaProvider } from "./components/Pwa";
import { BrowserRouter } from "react-router-dom";

// Create the root and render the application with BrowserRouter
ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <PwaProvider>
        <App />
      </PwaProvider>
    </BrowserRouter>
  </StrictMode>,
);
