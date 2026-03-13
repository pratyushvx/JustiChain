import axios from "axios";
import { useEffect, useState } from "react";
import "../styles/lawyer.css";
import lawyerBg from "../assets/lawyer.png";
import EvidencePanel from "../components/EvidencePanel";

function LawyerDashboard() {
  const [user, setUser] = useState({ name: "", salary: 0 });
  const [requests, setRequests] = useState([]);
  const [cases, setCases] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  // 🔹 TAB STATE
  const [activeTab, setActiveTab] = useState("requests");
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  /* =========================
     AUTH + LOAD DATA
  ========================= */
  useEffect(() => {
    const init = async () => {
      try {
        const me = await axios.get(
          "http://localhost:5000/api/auth/me",
          { withCredentials: true }
        );

        if (me.data.role !== "lawyer") {
          window.location.href = "/";
          return;
        }

        setUser({ name: me.data.name, salary: me.data.salary });

        await loadRequests();
        await loadCases();
      } catch {
        window.location.href = "/";
      }
    };

    init();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/lawyer/requests",
        { withCredentials: true }
      );
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRequests([]);
    }
  };

  const loadCases = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/lawyer/my-cases",
        { withCredentials: true }
      );
      setCases(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCases([]);
    }
  };

  /* =========================
     ACTIONS
  ========================= */
  const acceptRequest = async (requestId) => {
    setMessage("");
    setError("");

    try {
      await axios.post(
        "http://localhost:5000/api/lawyer/accept-request",
        { requestId },
        { withCredentials: true }
      );

      // setMessage("Case accepted successfully");
      setShowPopup(true);
      await loadRequests();
      await loadCases();
      setActiveTab("cases");
      setUser(prev => ({ ...prev, salary: prev.salary + 10000 }));
    } catch {
      setError("Failed to accept request");
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await axios.post(
        "http://localhost:5000/api/lawyer/reject-request",
        { requestId },
        { withCredentials: true }
      );
      await loadRequests();
    } catch {
      alert("Failed to reject request");
    }
  };

  const enterCourt = async (caseId) => {
    try {
      await axios.post(
        "http://localhost:5000/api/lawyer/enter-case",
        { caseId },
        { withCredentials: true }
      );

      sessionStorage.setItem("role", "lawyer");
      window.location.href = `/courtroom/${caseId}`;
    } catch {
      alert("Not authorized");
    }
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div
      className="lawyer-dashboard"
      style={{ backgroundImage: `url(${lawyerBg})` }}
    >
      {/* 🔹 NAVBAR */}
      <div className="lawyer-navbar">
        <h2>Lawyer</h2>

        <span className="welcome-text">
          Welcome, <b>{user.name}</b>
        </span>

        <span className="salary-badge" style={{ marginLeft: "20px", background: "#28a745", color: "white", padding: "5px 10px", borderRadius: "15px", fontSize: "0.9rem" }}>
          💰 Earnings: ${user.salary ? user.salary.toLocaleString() : 0}
        </span>

        <div className="nav-links">
          <span
            className={activeTab === "requests" ? "active" : ""}
            onClick={() => setActiveTab("requests")}
          >
            Pending Requests
          </span>
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
        {error && <p className="error">{error}</p>}

        {/* 📩 PENDING REQUESTS */}
        {activeTab === "requests" && (
          <>
            <h3>📩 Pending Requests</h3>

            {requests.length === 0 && <p>No pending requests</p>}

            {requests.map((r) => (
              <div key={r._id} className="case-card">
                <b>Case ID:</b> {r.caseId}
                <br />
                <b>Citizen:</b> {r.citizenId?.name}

                <div className="action-row">
                  <button onClick={() => acceptRequest(r._id)}>
                    Accept
                  </button>
                  <button
                    className="danger"
                    onClick={() => rejectRequest(r._id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* 📂 MY CASES */}
        {activeTab === "cases" && !selectedCaseId && (
          <>
            <h3>📂 My Cases</h3>

            {cases.length === 0 && <p>No cases assigned yet</p>}

            {cases.map((c) => (
              <div key={c.caseId} className="case-card">
                <b>{c.caseId}</b> — {c.title}
                <br />
                Status: {c.status}
                <br />
                <br />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => enterCourt(c.caseId)} style={{ flex: 1 }}>
                    Enter Courtroom
                  </button>
                  <button
                    onClick={() => setSelectedCaseId(c.caseId)}
                    style={{ flex: 1, background: '#475569' }}
                  >
                    📂 Evidence
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* 🕵️ EVIDENCE VIEW */}
        {selectedCaseId && (
          <div>
            <button
              onClick={() => setSelectedCaseId(null)}
              style={{ marginBottom: '10px', background: 'transparent', color: '#444', border: 'none', cursor: 'pointer', fontSize: '16px' }}
            >
              ← Back to Cases
            </button>
            <EvidencePanel caseId={selectedCaseId} role="lawyer" />
          </div>
        )}
      </div>


      {/* 💰 CREDIT POPUP */}
      {
        showPopup && (
          <div className="credit-popup-overlay">
            <div className="credit-popup">
              <h3>🎉 Payment Credited!</h3>
              <p>
                You have successfully accepted the case.<br />
                <b>$10,000</b> has been added to your wallet.
              </p>
              <button onClick={() => setShowPopup(false)}>Awesome</button>
            </div>
          </div>
        )
      }
    </div >
  );
}

export default LawyerDashboard;
