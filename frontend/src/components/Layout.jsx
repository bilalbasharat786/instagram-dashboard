import { NavLink, useNavigate } from "react-router-dom";
import api from "../services/api";

const Layout = ({ children, title, subtitle }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Local logout should still continue if server session already expired.
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">IG</span>
          <div>
            <strong>InstaFlow</strong>
            <small>Account workflow dashboard</small>
          </div>
        </div>

        <nav className="nav-list">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/accounts">Accounts</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="user-chip">
            <span>{user?.name || "User"}</span>
            <button className="ghost-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
};

export default Layout;
