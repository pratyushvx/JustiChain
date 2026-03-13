import { useState } from "react";
import axios from "axios";
import styles from "../styles/OpponentEntry.module.css";

function OpponentEntry() {
  const [caseId, setCaseId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const enterCourtroom = async () => {
    setError("");

    if (!caseId || !email) {
      setError("⚠️ Please fill all fields");
      return;
    }

    if (!email.includes("@")) {
      setError("⚠️ Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);

      // ✅ VALIDATE OPPONENT BEFORE ENTERING
      await axios.post("http://localhost:5000/api/judge/validate-opponent", {
        caseId,
        email
      });

      // ✅ Save opponent identity
      sessionStorage.setItem("role", "opponent");
      sessionStorage.setItem("opponentEmail", email);

      // 🚀 Enter courtroom
      window.location.href = `/courtroom/${caseId}`;
    } catch (err) {
      setError(err.response?.data?.msg || "Courtroom not accessible");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") enterCourtroom();
  };

  return (
    <div className={styles.container}>
      <div className={styles.entryCard}>
        <div className={styles.header}>
          <h2>Opponent Entry</h2>
          <p>Enter the courtroom as the opposing party</p>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.inputGroup}>
          <input
            placeholder="Case ID"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>

        <div className={styles.inputGroup}>
          <input
            placeholder="Opponent Email (same as judge added)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>

        <button
          className={styles.enterButton}
          onClick={enterCourtroom}
          disabled={loading}
        >
          {loading ? "Checking Courtroom..." : "Enter Courtroom"}
        </button>

        <div className={styles.instructions}>
          <h4>Important Notes:</h4>
          <ul>
            <li>Judge must add your email first</li>
            <li>Courtroom must be OPEN</li>
            <li>Hearing must be active</li>
            <li>No login required</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default OpponentEntry;
