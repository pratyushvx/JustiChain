import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import "../styles/courtroom.css";
import EvidencePanel from "../components/EvidencePanel";

const socket = io("http://localhost:5000", {
  withCredentials: true,
  transports: ["websocket"]
});

const ROLE_ICON = {
  judge: "👨‍⚖️",
  citizen: "👤",
  lawyer: "⚖️",
  police: "👮",
  opponent: "🧑",
  SYSTEM: "⚙️"
};

function Courtroom() {
  const caseId = window.location.pathname.split("/")[2];
  const joinedRef = useRef(false);

  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [opponentEmail, setOpponentEmail] = useState(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [adminReview, setAdminReview] = useState(null);

  const [judgeOrder, setJudgeOrder] = useState("");

  // ML Analysis state – stores the full response from the backend
  const [mlData, setMlData] = useState(null);

  useEffect(() => {
    const roleFromSession = sessionStorage.getItem("role");

    if (roleFromSession === "judge" || roleFromSession === "opponent") {
      setRole(roleFromSession);
      setUserId("SYSTEM");
      setOpponentEmail(sessionStorage.getItem("opponentEmail"));
      return;
    }

    const loadMe = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/auth/me",
          { withCredentials: true }
        );

        setRole(res.data.role);
        setUserId(res.data.userId || res.data._id);
        setOpponentEmail(res.data.email || null);
      } catch {
        setError("User role not found. Please login again.");
      }
    };

    loadMe();
  }, []);

  useEffect(() => {
    if (!role || !userId || joinedRef.current) return;

    joinedRef.current = true;

    socket.emit("join_courtroom", {
      caseId,
      role,
      userId,
      opponentEmail
    });

    socket.on("join_error", setError);
    socket.on("system_message", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("new_message", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("speaker_changed", ({ speaker }) => setActiveSpeaker(speaker));

    socket.on("ADMIN_REVIEW_UPDATE", (review) => {
      setAdminReview(review);
    });

    socket.on("JUDGE_FINAL_DECISION", (decisionData) => {
      let msg = "The Judge has made a decision!";
      if (decisionData.verdict === "CITIZEN_WINS") msg = "Judgment: Citizen won the case!";
      else if (decisionData.verdict === "OPPONENT_WINS") msg = "Judgment: Opponent won the case!";
      else if (decisionData.verdict === "PENDING") msg = "Judgment: Judge scheduled the next hearing.";
      
      alert(msg);
      window.location.href = `/hearings/${caseId}`;
    });

    return () => {
      socket.off("join_error");
      socket.off("system_message");
      socket.off("new_message");
      socket.off("speaker_changed");
      socket.off("ADMIN_REVIEW_UPDATE");
      socket.off("JUDGE_FINAL_DECISION");
    };
  }, [role, userId, opponentEmail, caseId]);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/admin/case/${caseId}`)
      .then(res => {
        if (res.data && res.data.adminReview) setAdminReview(res.data.adminReview);
      })
      .catch(() => console.log("No active session or admin review yet"));
  }, [caseId]);

  const sendMessage = () => {
    if (!text.trim() || !canSpeak) return;
    socket.emit("send_message", { text });
    setText("");
  };

  const setSpeaker = (speaker) => {
    socket.emit("set_speaker", { speaker });
  };

  const submitDecision = async (decision) => {
    if (!judgeOrder.trim()) {
      alert("Please write judge order / reasoning");
      return;
    }

    try {
      await axios.post(
        "http://localhost:5000/api/judge/final-decision",
        { caseId, decision, judgementText: judgeOrder },
        { withCredentials: true }
      );

      alert("Decision saved");
      window.location.href = `/hearings/${caseId}`;
    } catch {
      alert("Failed to save decision");
    }
  };

  // ===============================
  // AI SUGGESTION FUNCTION
  // ===============================
  const generateAISuggestion = async () => {
    try {
      console.log("🤖 Requesting AI Suggestion...");

      const res = await axios.post(
        `http://localhost:5000/api/judge/ai-suggestion/${caseId}`,
        {},
        { withCredentials: true }
      );

      console.log("📡 Full API Response:", res.data);

      // Extract the full ML analysis from the response
      const mlAnalysis = res.data?.mlAnalysis;

      if (!mlAnalysis) {
        alert("AI returned empty response");
        return;
      }

      console.log("🤖 Parsed ML Analysis:", mlAnalysis);
      setMlData(mlAnalysis);
      alert("🤖 AI Suggestion Generated Successfully");
    } catch (err) {
      console.error("❌ AI suggestion error:", err);
      if (err.response) {
        console.error("Server Error:", err.response.data);
      }
      alert("AI suggestion failed");
    }
  };

  // Helper to render a field that could be string or object
  const renderField = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return <p style={{ background: "#1f2937", padding: "10px", borderRadius: "4px" }}>{value}</p>;
    if (typeof value === "object") {
      // For objects, display as pretty JSON or iterate over keys
      return (
        <div style={{ background: "#1f2937", padding: "10px", borderRadius: "4px" }}>
          {Object.entries(value).map(([key, val]) => (
            <div key={key} style={{ marginBottom: "5px" }}>
              <strong style={{ color: "#9ca3af", textTransform: "capitalize" }}>{key.replace(/_/g, " ")}:</strong>{" "}
              {typeof val === "object" ? JSON.stringify(val) : String(val)}
            </div>
          ))}
        </div>
      );
    }
    return <p>{String(value)}</p>;
  };

  if (error) return (
    <div className="error-container">
      <h3>{error}</h3>
    </div>
  );

  if (!role || !userId) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Joining courtroom...</p>
    </div>
  );

  const canSpeak = role === "judge" || role === activeSpeaker;

  return (
    <div className="courtroom-page">
      <nav className="courtroom-navbar">
        <div className="nav-left">
          <div className="court-logo">🏛️ DIGITAL COURT</div>
          <div className="case-badge">Case ID: {caseId}</div>
        </div>
        <div className="nav-right">
          <div className="role-badge">Role: {role.toUpperCase()}</div>
          <button
            className="hearing-history-btn"
            onClick={() => window.location.href = `/hearings/${caseId}`}
          >
            📜 Hearing History
          </button>
          <button
            className="hearing-history-btn"
            style={{ background: '#0f766e', marginLeft: '10px' }}
            onClick={() => setShowEvidence(!showEvidence)}
          >
            📂 Evidence
          </button>
        </div>
      </nav>

      <div className="courtroom-container">
        <div className="courtroom-header">
          <h1 className="courtroom-title">Virtual Courtroom Session</h1>
          <p className="courtroom-subtitle">Case #{caseId} • Live Hearing</p>
        </div>

        <div className="speaker-panel">
          <h3 className="panel-title">🎙️ Speaker Control</h3>
          <p className="speaker-status">
            <b>Current Speaker:</b> {activeSpeaker ? activeSpeaker.toUpperCase() : "NONE"}
          </p>
          {role === "judge" && (
            <>
              <div className="speaker-controls">
                {["citizen", "lawyer", "police", "opponent"].map(r => (
                  <button
                    key={r}
                    className="speaker-btn"
                    onClick={() => setSpeaker(r)}
                  >
                    Allow {r.toUpperCase()}
                  </button>
                ))}
                <button
                  className="speaker-btn mute-all-btn"
                  onClick={() => setSpeaker(null)}
                >
                  🔇 Mute All
                </button>
              </div>
              <div className="current-speaker">
                Currently speaking: <span>{activeSpeaker || "None"}</span>
              </div>
            </>
          )}
        </div>

        <div className="court-chat">
          <div className="chat-header">
            <span>💬 Court Proceedings</span>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message message-${m.sender}`}>
                <div className="message-sender">
                  {ROLE_ICON[m.sender] || "👥"}
                  <span>{m.sender.toUpperCase()}</span>
                </div>
                <p className="message-text">{m.text}</p>
              </div>
            ))}
          </div>
          <div className="chat-input-container">
            <input
              className="chat-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={canSpeak ? "Type your statement here..." : "Muted by judge - Wait for your turn"}
              disabled={!canSpeak}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!canSpeak || !text.trim()}
            >
              📤 Send
            </button>
          </div>
        </div>

        {role === "judge" && (
          <div className="judge-panel">
            <h3 className="panel-title-large">⚖️ Final Judgment</h3>

            <button
              onClick={generateAISuggestion}
              style={{
                background: "#6366f1",
                color: "white",
                padding: "10px 16px",
                border: "none",
                borderRadius: "6px",
                marginBottom: "20px",
                cursor: "pointer"
              }}
            >
              🤖 Generate ML Suggestion
            </button>

            {mlData && (
              <div style={{
                background: "#111827",
                padding: "20px",
                borderRadius: "8px",
                marginBottom: "20px",
                borderLeft: "5px solid #6366f1",
                color: "white",
                fontFamily: "Arial, sans-serif"
              }}>
                <h3 style={{ color: "#a5b4fc", marginBottom: "15px" }}>
                  🤖 AI Judicial Assistant – Full Analysis
                </h3>

                {/* Case Summary */}
                {mlData.case_summary && (
                  <div style={{ marginBottom: "15px" }}>
                    <strong style={{ color: "#9ca3af" }}>📄 Case Summary</strong>
                    {renderField(mlData.case_summary)}
                  </div>
                )}

                {/* Statement Analysis */}
                {mlData.statement_analysis && (
                  <div style={{ marginBottom: "15px" }}>
                    <strong style={{ color: "#9ca3af" }}>📝 Statement Analysis</strong>
                    {renderField(mlData.statement_analysis)}
                  </div>
                )}

                {/* Credibility Scores */}
                {mlData.credibility_scores && (
                  <div style={{ marginBottom: "15px" }}>
                    <strong style={{ color: "#9ca3af" }}>⚖️ Credibility Scores</strong>
                    <div style={{ display: "flex", gap: "20px", marginTop: "5px" }}>
                      <div style={{ background: "#1f2937", padding: "8px 15px", borderRadius: "4px" }}>
                        Citizen: <span style={{ fontWeight: "bold", color: "#34d399" }}>{mlData.credibility_scores.citizen}</span>
                      </div>
                      <div style={{ background: "#1f2937", padding: "8px 15px", borderRadius: "4px" }}>
                        Opponent: <span style={{ fontWeight: "bold", color: "#f87171" }}>{mlData.credibility_scores.opponent}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Evidence Analysis */}
                {mlData.evidence_analysis && (
                  <div style={{ marginBottom: "15px" }}>
                    <strong style={{ color: "#9ca3af" }}>📊 Evidence Strength</strong>
                    <div style={{ background: "#1f2937", padding: "8px 15px", borderRadius: "4px", marginTop: "5px" }}>
                      Score: <span style={{ fontWeight: "bold", color: "#fbbf24" }}>{mlData.evidence_analysis.strength}</span>
                    </div>
                  </div>
                )}

                {/* Contradiction Analysis */}
                {mlData.contradiction_analysis && (
                  <div style={{ marginBottom: "15px" }}>
                    <strong style={{ color: "#9ca3af" }}>⚠️ Contradiction Detected</strong>
                    <div style={{ background: "#1f2937", padding: "8px 15px", borderRadius: "4px", marginTop: "5px" }}>
                      {mlData.contradiction_analysis.detected ? "Yes" : "No"}
                    </div>
                  </div>
                )}

                {/* Decision Fusion */}
                {mlData.decision_fusion && (
                  <div style={{ marginBottom: "15px" }}>
                    <strong style={{ color: "#9ca3af" }}>⚡ Decision Fusion</strong>
                    <div style={{ background: "#1f2937", padding: "10px", borderRadius: "4px", marginTop: "5px" }}>
                      <p><strong>Winner:</strong> {mlData.decision_fusion.winner}</p>
                      <p><strong>Explanation:</strong> {mlData.decision_fusion.explanation}</p>
                    </div>
                  </div>
                )}

                {/* AI Suggestion (Gemini) */}
                {mlData.ai_suggestion && (
                  <div style={{ marginBottom: "15px" }}>
                    <strong style={{ color: "#9ca3af" }}> Suggestion</strong>
                    {renderField(mlData.ai_suggestion)}
                  </div>
                )}
              </div>
            )}

            <textarea
              className="judge-textarea"
              value={judgeOrder}
              onChange={(e) => setJudgeOrder(e.target.value)}
              placeholder="Write official judgment..."
            />

            <div className="decision-buttons">
              <button
                className="decision-btn btn-hearing"
                onClick={() => submitDecision("NEXT_HEARING")}
                disabled={!judgeOrder.trim()}
              >
                📅 Schedule Next Hearing
              </button>
              <button
                className="decision-btn btn-win"
                onClick={() => submitDecision("WIN")}
                disabled={!judgeOrder.trim()}
              >
                ✅ Citizen Wins
              </button>
              <button
                className="decision-btn btn-loss"
                onClick={() => submitDecision("LOSS")}
                disabled={!judgeOrder.trim()}
              >
                ❌ Citizen Loses
              </button>
            </div>
          </div>
        )}
      </div>

      {showEvidence && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '0',
          width: '400px',
          height: 'calc(100% - 70px)',
          background: 'white',
          borderLeft: '1px solid #ccc',
          zIndex: 999,
          overflowY: 'auto',
          padding: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3>📂 Case Evidence</h3>
            <button onClick={() => setShowEvidence(false)}>✖</button>
          </div>
          <EvidencePanel caseId={caseId} role={role} isOpen={showEvidence} />
        </div>
      )}
    </div>
  );
}

export default Courtroom;