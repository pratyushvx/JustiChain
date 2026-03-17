import { useEffect, useState } from "react";
import axios from "axios";

function SocialPost() {
  const caseId = window.location.pathname.split("/")[2];

  const [postText, setPostText] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [gmailUrl, setGmailUrl] = useState("");

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/social/${caseId}`)
      .then((res) => {
        setPostText(res.data.post || "");
        setTwitterUrl(res.data.twitterUrl || "");
        setGmailUrl(res.data.gmailUrl || "");
      })
      .catch(() => alert("Failed to load post"));
  }, [caseId]);

  // 📋 Copy
  const copyPost = () => {
    if (!postText) return alert("Nothing to copy!");
    navigator.clipboard.writeText(postText);
    alert("Post copied!");
  };

  // 🐦 Post to X (MAIN FIXED FUNCTION)
  const postToX = () => {
    let url = twitterUrl;

    // 🔥 Fallback (if backend URL missing)
    if (!url && postText) {
      const encoded = encodeURIComponent(postText);
      url = `https://twitter.com/intent/tweet?text=${encoded}`;
    }

    // 🔥 Final safety
    if (!url) {
      alert("Post not ready!");
      return;
    }

    window.open(url, "_blank");
  };

  // 📧 Gmail
  const sendGmail = () => {
    let url = gmailUrl;

    // 🔥 Fallback
    if (!url && postText) {
      const subject = "Case Update";
      const body = postText;

      url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
    }

    if (!url) {
      alert("Email not ready!");
      return;
    }

    window.open(url, "_blank");
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📢 Share Case</h2>

      <div style={styles.box}>
        <textarea
          value={postText}
          rows="8"
          style={styles.textarea}
          readOnly
        />
      </div>

      <div style={styles.actions}>
        <button
          style={styles.btn}
          onClick={postToX}
          disabled={!postText}
        >
          🐦 Post on X
        </button>

        <button
          style={styles.btn}
          onClick={sendGmail}
          disabled={!postText}
        >
          📧 Send Gmail
        </button>

        <button
          style={styles.btn}
          onClick={copyPost}
          disabled={!postText}
        >
          📋 Copy Text
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    maxWidth: "700px",
    margin: "auto",
    textAlign: "center",
    fontFamily: "Arial"
  },
  title: {
    marginBottom: "20px"
  },
  box: {
    background: "#f5f5f5",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
  },
  textarea: {
    width: "100%",
    border: "none",
    resize: "none",
    background: "transparent",
    fontSize: "15px",
    outline: "none"
  },
  actions: {
    marginTop: "20px",
    display: "flex",
    gap: "10px"
  },
  btn: {
    flex: 1,
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    background: "#007bff",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold"
  }
};

export default SocialPost;