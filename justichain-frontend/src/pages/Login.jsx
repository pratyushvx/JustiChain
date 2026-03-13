import axios from "axios";
import { useState } from "react";
import styles from "../styles/Login.module.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const validate = () => {
    if (!email || !password) {
      setError("⚠️ Please fill in all fields");
      return false;
    }

    if (!email.includes("@")) {
      setError("⚠️ Please enter a valid email address");
      return false;
    }

    setError("");
    return true;
  };

  const login = async () => {
    if (!validate()) return;

    try {
      await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password },
        { withCredentials: true }
      );

      const res = await axios.get(
        "http://localhost:5000/api/auth/me",
        { withCredentials: true }
      );

      const role = res.data.role;
      if (role === "citizen") {
        window.location.href = "/citizen";
      } else if (role === "lawyer") {
        window.location.href = "/lawyer";
      } else if (role === "police") {
        window.location.href = "/police";
      } else {
        window.location.href = "/court";
      }

    } catch (err) {
      setError("⚠️ Invalid email or password");
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.authIcon}>⚖️</div>
        <h2 className={styles.authTitle}>Welcome Back</h2>
        <p className={styles.authSubtext}>
          Log in to continue your journey towards a transparent digital justice system.
        </p>

        {error && <p className={styles.errorText}>{error}</p>}

        <input
          placeholder="Email Address"
          className={`${styles.authInput} ${error && !email ? styles.errorInput : ""}`}
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className={`${styles.authInput} ${error && !password ? styles.errorInput : ""}`}
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button className={styles.authButton} onClick={login}>
          Login
        </button>

        <p className={styles.authFooter}>
          New to JustiChain? <a href="/register" className={styles.authLink}>Create an account</a>
        </p>
      </div>
    </div>
  );
}

export default Login;