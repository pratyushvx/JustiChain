import axios from "axios";
import { useEffect, useState } from "react";
import "../styles/judge.css";

function JudgeDashboard() {
  const [cases, setCases] = useState([]);
  const [policeList, setPoliceList] = useState([]);
  const [error, setError] = useState("");

  const [activeTab] = useState("cases");

  useEffect(() => {
    loadCases();
    loadPolice();
  }, []);

  const loadCases = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/judge/cases");
      setCases(res.data);
    } catch {
      setError("Failed to load cases");
    }
  };

  const loadPolice = async () => {
    const res = await axios.get("http://localhost:5000/api/judge/police-list");
    setPoliceList(res.data);
  };

  const assignPolice = async (caseId, policeId) => {
    if (!policeId) return;
    await axios.post("http://localhost:5000/api/judge/assign-police", {
      caseId,
      policeId
    });
    loadCases();
  };

  const addOpponent = async (caseId, name, email) => {
    if (!name || !email) return alert("Enter opponent details");
    await axios.post("http://localhost:5000/api/judge/add-opponent", {
      caseId,
      name,
      email
    });
    loadCases();
  };

  const scheduleHearing = async (caseId, hearingDate, status) => {
    if (!hearingDate) return;

    if (["WIN", "LOSS", "CLOSED"].includes(status)) {
      alert("Final verdict already given. No further hearings allowed.");
      return;
    }

    await axios.post("http://localhost:5000/api/judge/schedule-hearing", {
      caseId,
      hearingDate
    });
    loadCases();
  };

  const toggleCourtroom = async (caseId, open, status) => {
    if (["WIN", "LOSS", "CLOSED"].includes(status)) {
      alert("Case already closed. Courtroom cannot be opened.");
      return;
    }

    await axios.post("http://localhost:5000/api/judge/courtroom-control", {
      caseId,
      open
    });
    loadCases();
  };

  return (
    <div className="judge-dashboard">
      {/* ================= NAVBAR ================= */}
      <div className="judge-navbar">
        <h2>Judge</h2>

        <div className="nav-links">
          <span className={activeTab === "cases" ? "active" : ""}>
            Case Management
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

      {/* ================= CONTENT ================= */}
      <div className="judge-container">
        {error && <div className="judge-error">{error}</div>}

        {cases.map((c) => {
          const isFinal = c.status === "CLOSED";


          const canEnterCourtroom =
            !isFinal &&
            c.lawyerId &&
            c.policeId &&
            c.opponent?.email &&
            c.hearingDate &&
            c.courtroomOpen;

          return (
            <div key={c.caseId} className="judge-case-card">
              <b>Case ID:</b> {c.caseId}<br />
              <b>Title:</b> {c.title}<br />
              <b>Status:</b>{" "}
              <span style={{ color: isFinal ? "red" : "green" }}>
                {c.status}
              </span><br />

              <b>Police:</b> {c.policeId?.name || "Not assigned"}<br />
              <b>Opponent:</b> {c.opponent?.email || "Not added"}<br />

              <b>Hearing:</b>{" "}
              {c.hearingDate
                ? new Date(c.hearingDate).toLocaleString()
                : "Not scheduled"}<br />

              <b>Courtroom:</b> {c.courtroomOpen ? "OPEN" : "CLOSED"}

             

              {/* FINAL VERDICT MESSAGE */}
              {isFinal && (
                <p style={{ color: "red", fontWeight: "bold" }}>
                  ⚖️ Final Verdict Given — No Further Action Allowed
                </p>
              )}

              {/* ASSIGN POLICE */}
              {!isFinal && !c.policeId && (
                <select onChange={(e) => assignPolice(c.caseId, e.target.value)}>
                  <option value="">Assign Police</option>
                  {policeList.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}

              {/* ADD OPPONENT */}
              {!isFinal && !c.opponent?.email && (
                <>
                  <input
                    placeholder="Opponent Name"
                    onChange={(e) => (c._name = e.target.value)}
                  />
                  <input
                    placeholder="Opponent Email"
                    onChange={(e) => (c._email = e.target.value)}
                  />
                  <button
                    className="judge-btn-primary"
                    onClick={() => addOpponent(c.caseId, c._name, c._email)}
                  >
                    Add Opponent
                  </button>
                </>
              )}

              <br /><br />

              {/* SCHEDULE HEARING */}
              {!isFinal && (
                <>
                  <input
                    type="datetime-local"
                    onChange={(e) =>
                      scheduleHearing(c.caseId, e.target.value, c.status)
                    }
                  />
                  <br /><br />
                </>
              )}

              {/* COURTROOM CONTROL */}
              {!isFinal && (
                <>
                  <button
                    className="judge-btn-success"
                    onClick={() => toggleCourtroom(c.caseId, true, c.status)}
                  >
                    Open Courtroom
                  </button>
                  <button
                    className="judge-btn-danger"
                    onClick={() => toggleCourtroom(c.caseId, false, c.status)}
                  >
                    Close Courtroom
                  </button>
                </>
              )}

              <br /><br />

              {/* ENTER COURTROOM */}
              {canEnterCourtroom ? (
                <button
                  className="judge-btn-primary"
                  onClick={() => {
                    sessionStorage.setItem("role", "judge");
                    window.location.href = `/courtroom/${c.caseId}`;
                  }}
                >
                  Enter Courtroom
                </button>
              ) : (
                !isFinal && (
                  <p className="judge-warning">
                    ⚠️ Complete all assignments before courtroom access
                  </p>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default JudgeDashboard;
