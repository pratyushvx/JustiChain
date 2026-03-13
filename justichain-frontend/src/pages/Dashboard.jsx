import axios from "axios";
import { useEffect, useState } from "react";
import "../styles/dashboard.css";

function Dashboard() {
  const [user, setUser] = useState({
    name: "",
    role: ""
  });

  // 🔐 Verify login & fetch user details
  useEffect(() => {
    axios.get(
      "http://localhost:5000/api/protected/dashboard",
      { withCredentials: true }
    )
    .then(res => {
      setUser(res.data); // { name, role }
    })
    .catch(() => {
      window.location.href = "/";
    });
  }, []);

  // 🔓 Logout
  const logout = async () => {
    await axios.post(
      "http://localhost:5000/api/auth/logout",
      {},
      { withCredentials: true }
    );
    window.location.href = "/";
  };

  return (
    <div className="dashboard-page">

      {/* HEADER */}
      <div className="dashboard-header">
        <h1>JustiChain Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </div>

      {/* USER INFO */}
      <div className="user-info">
        Welcome <span>{user.name}</span> 👋 <br />
        Role: <span>{user.role}</span>
      </div>

      {/* HERO SECTION (BACKGROUND IMAGE) */}
      <div className="dashboard-hero">
        <img
          src="/background.png"
          alt="Background"
          className="dashboard-bg-img"
        />

        <div className="dashboard-overlay">
          <h2>Digital Justice, Simplified</h2>
          <p>
            A secure platform where citizens, lawyers, and police
            collaborate through transparent digital processes.
          </p>
        </div>
      </div>

      {/* DASHBOARD IMAGE */}
      <div className="dashboard-image">
        <img
          src="/dashboard.png"
          alt="Dashboard"
        />
      </div>

      {/* ACTION CARDS */}
      <div className="dashboard-content">

        <div className="card">
          <h3>📄 Create Case</h3>
          <p>Submit a new legal complaint digitally.</p>
        </div>

        <div className="card">
          <h3>📂 My Cases</h3>
          <p>View and track all your submitted cases.</p>
        </div>

        <div className="card">
          <h3>⚖️ Hearings</h3>
          <p>Attend online legal hearings securely.</p>
        </div>

      </div>

      {/* FOOTER */}
      <div className="dashboard-footer">
        © 2026 JustiChain – Digital Justice Platform
      </div>

    </div>
  );
}

export default Dashboard;
