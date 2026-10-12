import PropTypes from "prop-types";
import { Link, NavLink } from "react-router-dom";
import {
  ScanLine,
  PanelTop,
  FolderOpen,
  KeyRound,
  Settings,
  ArrowUpRight,
} from "lucide-react";
export function Brand() {
  return (
    <Link to="/homepage" className="brand" aria-label="SecurMask workspace">
      <ScanLine size={25} strokeWidth={1.8} />
      <span>
        SecurMask<span className="brand-period">.</span>
      </span>
    </Link>
  );
}
export default function Workspace({ children, title }) {
  return (
    <div className="workspace">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="workspace-header">
        <Brand />
        <span className="header-context">
          THE PRIVACY WORKSPACE <span>/</span> {title}
        </span>
        <Link to="/about-us" className="header-help">
          How it works <ArrowUpRight size={14} />
        </Link>
      </header>
      <main id="main-content" className="workspace-main">
        {children}
        <footer className="workspace-footer">
          <span>SecurMask — share thoughtfully.</span>
          <Link to="/contact">
            Help & feedback <ArrowUpRight size={13} />
          </Link>
        </footer>
      </main>
      <nav className="dock" aria-label="Main navigation">
        {[
          [PanelTop, "Workspace", "/homepage"],
          [FolderOpen, "Files", "/folder"],
          [KeyRound, "Recover", "/recover"],
          [Settings, "Settings", "/setting"],
        ].map(([Icon, label, path]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              isActive ? "dock-item active" : "dock-item"
            }
          >
            <Icon size={20} strokeWidth={1.7} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

Workspace.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
};
