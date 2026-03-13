import axios from "axios";
import { useState } from "react";
import styles from "../styles/Register.module.css";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "citizen"
  });

  const [error, setError] = useState("");

  const validate = () => {
    if (!form.name || !form.email || !form.password) {
      setError("⚠️ All fields are required");
      return false;
    }

    if (!form.email.includes("@")) {
      setError("⚠️ Please enter a valid email address");
      return false;
    }

    if (form.password.length < 6) {
      setError("⚠️ Password must be at least 6 characters");
      return false;
    }

    setError("");
    return true;
  };

  const register = async () => {
    if (!validate()) return;

    try {
      await axios.post(
        "http://localhost:5000/api/auth/register",
        form,
        { withCredentials: true }
      );

      alert("Welcome to JustiChain ⚖️");
      window.location.href = "/";
    } catch {
      setError("⚠️ User already exists or server error");
    }
  };

  return (
    <div className={styles.registerPage}>
      {/* HERO SECTION */}
      <section className={styles.heroSection}>
        <div className={styles.heroOverlay}>
          <h1>Justice Should Be Accessible</h1>

          <p className={styles.heroText}>
            JustiChain is a digital justice platform designed to empower
            citizens, lawyers, and authorities through transparency,
            accountability, and technology.
          </p>

          <div className={styles.heroPoints}>
            <p>✔ File and track cases digitally</p>
            <p>✔ Secure & transparent legal process</p>
            <p>✔ Role-based access for citizens, police & lawyers</p>
            <p>✔ Built for trust, fairness & speed</p>
          </div>

          <p className={styles.scrollText}>⬇ Scroll to create your account</p>

          {/* 👨‍⚖️ JUDGE / ADMIN ACCESS BUTTON */}
          <button
            className={styles.judgeAccessBtn}
            onClick={() => window.location.href = "/judge-access"}
          >
            👨‍⚖️ Judge / Admin Access
          </button>
        </div>
      </section>

      {/* FORM SECTION */}
      <section className={styles.formSection}>
        <div className={styles.authContainer}>
          <div className={styles.authIcon}>⚖️</div>
          <h2>Create Your Account</h2>

          <p className={styles.authSubtext}>
            Join thousands moving towards a smarter and
            more transparent justice system.
          </p>

          {error && <p className={styles.errorText}>{error}</p>}

          <input
            placeholder="Full Name"
            className={`${styles.authInput} ${error && !form.name ? styles.errorInput : ""}`}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />

          <input
            placeholder="Email Address"
            className={`${styles.authInput} ${error && !form.email ? styles.errorInput : ""}`}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />

          <input
            type="password"
            placeholder="Create Password"
            className={`${styles.authInput} ${error && !form.password ? styles.errorInput : ""}`}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />

          <select
            className={styles.authSelect}
            onChange={e => setForm({ ...form, role: e.target.value })}
          >
            <option value="citizen">Citizen</option>
            <option value="lawyer">Lawyer</option>
            <option value="police">Police</option>
          </select>

          <button className={styles.authButton} onClick={register}>
            Join JustiChain
          </button>

          <p className={styles.authFooter}>
            Already registered? <a href="/" className={styles.authLink}>Login here</a>
          </p>
        </div>
      </section>
    </div>
  );
}

export default Register;