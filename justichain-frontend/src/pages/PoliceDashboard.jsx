import axios from "axios";
import { useEffect, useState } from "react";
import "../styles/police.css";
import policeBg from "../assets/police.png";

function PoliceDashboard() {
  const [user, setUser] = useState({ name: "" });
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  // 🔹 TAB STATE
  const [activeTab, setActiveTab] = useState("assign");

  /* =========================
     AUTH + LOAD CASES
  ========================= */
  useEffect(() => {
    const init = async () => {
      try {
        const me = await axios.get(
          "http://localhost:5000/api/auth/me",
          { withCredentials: true }
        );

        if (me.data.role !== "police") {
          window.location.href = "/";
          return;
        }

        setUser({ name: me.data.name });

        await loadCases();
      } catch {
        window.location.href = "/";
      }
    };

    init();
  }, []);

  const loadCases = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/police/my-cases",
        { withCredentials: true }
      );
      setCases(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCases([]);
    }
  };

  /* =========================
     ASSIGN CASE
  ========================= */
  const assignCase = async () => {
    try {
      const res = await axios.post(
        "http://localhost:5000/api/police/assign",
        { caseId },
        { withCredentials: true }
      );

      setMessage(res.data.msg);
      setCaseId("");
      await loadCases();
      setActiveTab("cases");
    } catch (err) {
      setMessage(err.response?.data?.msg || "Assignment failed");
    }
  };

  /* =========================
     ENTER COURTROOM
  ========================= */
  const enterCourtroom = async (id) => {
    try {
      await axios.post(
        "http://localhost:5000/api/police/enter-case",
        { caseId: id },
        { withCredentials: true }
      );

      sessionStorage.setItem("role", "police");
      window.location.href = `/courtroom/${id}`;
    } catch {
      alert("Not authorized or courtroom closed");
    }
  };

  /* =========================
     ADD NOTE
  ========================= */
  const addNote = async () => {
    try {
      await axios.post(
        "http://localhost:5000/api/police/add-note",
        { caseId, note },
        { withCredentials: true }
      );

      setMessage("Investigation note added");
      setNote("");
    } catch {
      setMessage("Failed to add note");
    }
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div
      className="police-dashboard"
      style={{ backgroundImage: `url(${policeBg})` }}
    >
      {/* 🔹 NAVBAR */}
      <div className="police-navbar">
        <h2>Police</h2>

        <span className="welcome-text">
          Welcome, <b>{user.name}</b>
        </span>

        <div className="nav-links">
        
          <span
            className={activeTab === "cases" ? "active" : ""}
            onClick={() => setActiveTab("cases")}
          >
            My Cases
          </span>
        </div>

        <button
          className="logout-btn"
          onClick={async () => {
            await axios.post(
              "http://localhost:5000/api/auth/logout",
              {},
              { withCredentials: true }
            );
            window.location.href = "/";
          }}
        >
          Logout
        </button>
      </div>

      {/* 🔹 CONTENT */}
      <div className="dashboard-container">
        {message && <p className="success">{message}</p>}

        

        
        {/* MY CASES */}
        {activeTab === "cases" && (
          <>
            <h3>My Assigned Cases</h3>

            {cases.length === 0 && <p>No assigned cases yet</p>}

            {cases.map((c) => (
              <div key={c.caseId} className="case-card">
                <b>{c.caseId}</b> — {c.title}
                <br />
                Status: {c.status}
                <br /><br />
                <button onClick={() => enterCourtroom(c.caseId)}>
                  Enter Courtroom
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default PoliceDashboard;
