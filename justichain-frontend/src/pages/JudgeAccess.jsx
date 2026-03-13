import axios from "axios";
import { useState } from "react";
import styles from "../styles/JudgeAccess.module.css";

function JudgeAccess() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const submitCode = async () => {
    setError("");

    try {
      await axios.post(
        "http://localhost:5000/api/auth/admin-access",
        { code },
        { withCredentials: true }
      );
      window.location.href = "/judge";
    } catch {
      setError("❌ Invalid Judge Code");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Judge / Admin Access</h2>
        <p>Enter the secure judge code to access the dashboard</p>
      </div>

      <div className={styles.form}>
        <p>Access is restricted to authorized personnel only</p>
        
        <div className={styles.inputGroup}>
          <input
            type="password"
            placeholder="Enter Judge Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && submitCode()}
          />
        </div>

        <button className={styles.button} onClick={submitCode}>
          Enter Judge Dashboard
        </button>

        {error && <div className={styles.errorMessage}>{error}</div>}
      </div>
    </div>
  );
}

export default JudgeAccess;