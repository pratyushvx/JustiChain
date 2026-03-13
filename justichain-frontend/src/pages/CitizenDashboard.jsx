import axios from "axios";
import { useEffect, useState } from "react";
import styles from "../styles/CitizenDashboard.module.css";
import citizenBg from "../assets/background.png";
import EvidencePanel from "../components/EvidencePanel";

function CitizenDashboard() {

  const [user, setUser] = useState({ name: "" });
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pincode, setPincode] = useState("");

  /* ML RESULT */
  const [predictedCaseType, setPredictedCaseType] = useState("");
  const [predictionConfidence, setPredictionConfidence] = useState(null);

  const [lawyerSuggestions, setLawyerSuggestions] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeTab, setActiveTab] = useState("register");

  /* ================= AUTH ================= */

  useEffect(() => {
    const init = async () => {
      try {

        const me = await axios.get(
          "http://localhost:5000/api/auth/me",
          { withCredentials: true }
        );

        if (me.data.role !== "citizen") {
          window.location.href = "/";
          return;
        }

        setUser({ name: me.data.name });
        loadCases();

      } catch {
        window.location.href = "/";
      }
    };

    init();
  }, []);

  const loadCases = async () => {

    try {

      const res = await axios.get(
        "http://localhost:5000/api/citizen/my-cases",
        { withCredentials: true }
      );

      setCases(Array.isArray(res.data) ? res.data : []);

    } catch {
      setCases([]);
    }
  };

  /* ================= ML PREDICT ================= */

  const predictCaseType = async () => {

    setError("");

    if (!description) {
      setError("Enter description first");
      return;
    }

    try {

      const res = await axios.post(
        "http://localhost:5000/api/citizen/predict-case-type",
        { description },
        { withCredentials: true }
      );

      setPredictedCaseType(res.data.predictedType);
      setPredictionConfidence(res.data.confidence);

    } catch {
      setError("ML prediction failed");
    }
  };

  /* ================= REGISTER CASE ================= */

  const registerCase = async () => {

    setError("");
    setSuccess("");

    if (!title || !description || !predictedCaseType) {
      setError("Fill title, description and predict case type");
      return;
    }

    try {

      await axios.post(
        "http://localhost:5000/api/citizen/register-case",
        {
          title,
          description,
          caseType: predictedCaseType,
          pincode,
          predictedCaseType,
          predictionConfidence
        },
        { withCredentials: true }
      );

      setSuccess("Case registered successfully");

      setTitle("");
     setDescription("");setPincode("");
setPredictedCaseType("");
setPredictionConfidence(null);

      loadCases();
      setActiveTab("cases");

    } catch {
      setError("Failed to register case");
    }
  };

  /* ================= LAWYERS ================= */

  const loadLawyerSuggestions = async (caseId) => {

    if (lawyerSuggestions[caseId]) return;

    const res = await axios.get(
      `http://localhost:5000/api/citizen/suggest-lawyers/${caseId}`,
      { withCredentials: true }
    );

    setLawyerSuggestions(prev => ({
      ...prev,
      [caseId]: res.data || []
    }));
  };

  const sendLawyerRequest = async (lawyerId, caseId) => {

    await axios.post(
      "http://localhost:5000/api/citizen/send-lawyer-request",
      { lawyerId, caseId },
      { withCredentials: true }
    );

    alert("Request sent");
  };

  /* ================= ENTER COURT ================= */

  const enterCourt = async () => {

    try {

      await axios.post(
        "http://localhost:5000/api/citizen/enter-case",
        { caseId },
        { withCredentials: true }
      );

      sessionStorage.setItem("role", "citizen");
      window.location.href = `/courtroom/${caseId}`;

    } catch (err) {
      setError(err.response?.data?.msg || "Unauthorized or closed");
    }
  };

  /* ================= RENDER ================= */

  return (

    <div
      className={styles.citizenDashboard}
      style={{ backgroundImage: `url(${citizenBg})` }}
    >

      {/* NAVBAR */}

      <div className={styles.citizenNavbar}>

        <h2>Citizen</h2>

        <span className={styles.welcomeText}>
          Welcome, <b>{user.name}</b>
        </span>

        <div className={styles.navLinks}>

          <span
            className={activeTab === "register" ? styles.active : ""}
            onClick={() => setActiveTab("register")}
          >
            Register Case
          </span>
          
          <span
            className={activeTab === "enter" ? styles.active : ""}
            onClick={() => setActiveTab("enter")}
          >
            Enter Courtroom
          </span>

          <span
            className={activeTab === "cases" ? styles.active : ""}
            onClick={() => setActiveTab("cases")}
          >
            Your Cases
          </span>

        </div>

        <button
          className={styles.logoutBtn}
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

      {/* CONTENT */}

      <div className={styles.dashboardContainer}>

        {/* ENTER COURT */}

        {activeTab === "enter" && (
          <div className={styles.tabContent}>

            <h3>Enter Courtroom</h3>

            <input
              value={caseId}
              onChange={e => setCaseId(e.target.value)}
              placeholder="Enter Case ID"
            />

            <button onClick={enterCourt}>Enter</button>

            {error && <p className={styles.error}>{error}</p>}

          </div>
        )}

        {/* REGISTER CASE */}

        {activeTab === "register" && (
          <div className={styles.tabContent}>

            <h3>Register New Case</h3>

            <input
              placeholder="Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Case description..."
            />

            <button
              style={{ marginTop: "10px" }}
              onClick={predictCaseType}
            >
              🔍 Predict Case Type
            </button>

            {predictedCaseType && (
              <div style={{ marginTop: "15px" }}>

                <label><b>Case Type (AI Detected)</b></label>

                <input
                  value={predictedCaseType}
                  readOnly
                  style={{ background: "#f1f5f9" }}
                />

                <p>
                  <b>Confidence:</b> {(predictionConfidence * 100).toFixed(2)}%
                </p>

              </div>
            )}

            <input
  placeholder="Pincode"
  value={pincode}
  onChange={e => setPincode(e.target.value)}
/>

            <button
              className={styles.secondary}
              onClick={registerCase}
            >
              Submit Case
            </button>

            {success && <p className={styles.success}>{success}</p>}
            {error && <p className={styles.error}>{error}</p>}

          </div>
        )}

        {/* CASE LIST */}

        {activeTab === "cases" && (
          <div className={styles.tabContent}>

            <h3>Your Cases</h3>

            {cases.length === 0 ? (

              <p className={styles.emptyState}>
                No cases registered yet.
              </p>

            ) : selectedCaseId ? (

              <div>

                <button
                  onClick={() => setSelectedCaseId(null)}
                  style={{ marginBottom: "10px" }}
                >
                  ← Back to Cases
                </button>

                <EvidencePanel caseId={selectedCaseId} role="citizen" />

              </div>

            ) : (

cases.map(c => (

  <div key={c.caseId} className={styles.caseCard}>

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span className={styles.caseId}>{c.caseId}</span>

      <button
        onClick={() => setSelectedCaseId(c.caseId)}
        style={{
          padding: '4px 8px',
          fontSize: '11px',
          background: '#e2e8f0',
          color: '#1e293b',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        📂 Evidence
      </button>
    </div>

    <h4 className={styles.caseTitle}>{c.title}</h4>

    <p className={styles.caseDetails}>
      Type: {c.caseType} | Status:{" "}
      <span className={`${styles.caseStatus}`}>
        {c.status}
      </span>
    </p>

    {/* AI Prediction */}

    {c.predictedCaseType && (
      <p>
        <b>AI Prediction:</b> {c.predictedCaseType}
        ({(c.predictionConfidence * 100).toFixed(1)}%)
      </p>
    )}

    {/* LAWYER SUGGESTION BUTTON */}

    {!c.lawyerId && (
      <div className={styles.caseActions}>
        <button onClick={() => loadLawyerSuggestions(c.caseId)}>
          👨‍⚖️ Suggest Lawyers
        </button>
      </div>
    )}

    {/* LAWYER LIST */}

    {lawyerSuggestions[c.caseId]?.map(l => (
      <div key={l._id} className={styles.lawyerCard}>

        <div className={styles.lawyerInfo}>

          <div className={styles.lawyerAvatar}>
            {l.name.charAt(0).toUpperCase()}
          </div>

          <div className={styles.lawyerDetails}>
            <h4>{l.name}</h4>
            <p>Specialty: {l.specialty || "General Law"}</p>
          </div>

        </div>

        <button onClick={() => sendLawyerRequest(l._id, c.caseId)}>
          Send Request
        </button>

      </div>
    ))}

  </div>

))

            )}

          </div>
        )}

      </div>

    </div>
  );
}

export default CitizenDashboard;