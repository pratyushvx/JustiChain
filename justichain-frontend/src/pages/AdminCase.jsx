import { useEffect, useState } from "react";

import { io } from "socket.io-client";
import axios from "axios";
import "../styles/courtroom.css"; // Reuse courtroom styles or create new
import "../styles/admin.css"; // New styles for admin

const socket = io("http://localhost:5000", {
    withCredentials: true,
    transports: ["websocket"]
});

function AdminCase() {
    const caseId = window.location.pathname.split("/")[3]; // /admin/case/:caseId

    const [sessionData, setSessionData] = useState(null);
    const [statements, setStatements] = useState([]);
    const [evidence, setEvidence] = useState([]);
    const [adminReview, setAdminReview] = useState({ decision: "PENDING", remarks: "" });
    const [loading, setLoading] = useState(true);

    // Form state
    const [decisionInput, setDecisionInput] = useState("VALID"); // Default
    const [remarksInput, setRemarksInput] = useState("");

    useEffect(() => {
        // Fetch initial session data
        const fetchSession = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/admin/case/${caseId}`);
                setSessionData(res.data);
                setStatements(res.data.statements || []);
                setEvidence(res.data.evidenceSnapshot || []);
                if (res.data.adminReview) {
                    setAdminReview(res.data.adminReview);
                    setDecisionInput(res.data.adminReview.decision);
                    setRemarksInput(res.data.adminReview.remarks);
                }
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch session", err);
                setLoading(false);
            }
        };

        fetchSession();

        // Socket Join - Admin listens to this room
        // The room ID is usually the courtRoomId. We need to get it.
        // However, the admin might not be "joining" as a participant in the same way.
        // But to receive room events, we must be in the room.
        // Creating a special join event for admin or reusing join_courtroom?
        // Let's use join_courtroom with role "admin".
        socket.emit("join_courtroom", {
            caseId,
            role: "admin", // specific role
            userId: "admin_" + Date.now() // specific ID
        });

        socket.on("CASE_UPDATE", (data) => {
            if (data.statements) setStatements(data.statements);
            if (data.evidenceScores) setEvidence(data.evidenceScores);
        });

        socket.on("ADMIN_REVIEW_UPDATE", (review) => {
            setAdminReview(review); // Update local view if another admin updates or confirmation
        });

        // Fallback for chat messages if CASE_UPDATE isn't enough or for animation
        socket.on("new_message", (msg) => {
            // We can append to statements if structure matches, or just rely on CASE_UPDATE for full sync
            // CASE_UPDATE is better for consistency as per user request
        });

        return () => {
            socket.off("CASE_UPDATE");
            socket.off("ADMIN_REVIEW_UPDATE");
        };
    }, [caseId]);

    const handleSubmitReview = async () => {
        try {
            await axios.post(`http://localhost:5000/api/admin/case/${caseId}/review`, {
                decision: decisionInput,
                remarks: remarksInput
            });
            alert("Review Submitted");
        } catch (err) {
            alert("Error submitting review");
        }
    };

    if (loading) return <div>Loading Case Session...</div>;

    return (
        <div className="admin-case-page">
            <div className="admin-header">
                <h1>🛡️ Admin Review Console</h1>
                <p>Case ID: {caseId}</p>
            </div>

            <div className="admin-layout">
                {/* LEFT: Live Feed */}
                <div className="admin-live-feed">
                    <div className="section-title">💬 Live Statements</div>
                    <div className="statements-list">
                        {statements.length === 0 ? <p>No statements yet.</p> :
                            statements.map((s, i) => (
                                <div key={i} className={`statement-item ${s.from}`}>
                                    <strong>{s.from}:</strong> {s.text}
                                    <span className="time">{new Date(s.createdAt).toLocaleTimeString()}</span>
                                </div>
                            ))}
                    </div>
                </div>

                {/* MIDDLE: Evidence */}
                <div className="admin-evidence">
                    <div className="section-title">📂 Evidence & Scores</div>
                    <div className="evidence-list-admin">
                        {evidence.length === 0 ? <p>No evidence uploaded.</p> :
                            evidence.map((e, i) => (
                                <div key={i} className="evidence-card-admin">
                                    <div className="evidence-info">
                                        <strong>{e.title}</strong>
                                        {e.fileUrl && <a href={`http://localhost:5000/${e.fileUrl}`} target="_blank" rel="noreferrer">View</a>}
                                    </div>
                                    <div className="evidence-score">
                                        <span>Authenticity:</span>
                                        <div className="score-badge" style={{
                                            backgroundColor: e.authenticityScore > 0.8 ? '#4ade80' : e.authenticityScore > 0.5 ? '#facc15' : '#f87171'
                                        }}>
                                            {(e.authenticityScore * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {/* RIGHT: Controls */}
                <div className="admin-controls">
                    <div className="section-title">⚖️ Admin Decision</div>

                    <div className="control-group">
                        <label>Verdict Formulation</label>
                        <select value={decisionInput} onChange={(e) => setDecisionInput(e.target.value)}>
                            <option value="VALID">✅ VALID</option>
                            <option value="DOUBTFUL">⚠️ DOUBTFUL</option>
                            <option value="INVALID">❌ INVALID</option>
                        </select>
                    </div>

                    <div className="control-group">
                        <label>Remarks for Judge</label>
                        <textarea
                            rows="5"
                            value={remarksInput}
                            onChange={(e) => setRemarksInput(e.target.value)}
                            placeholder="Explain the authenticity findings..."
                        ></textarea>
                    </div>

                    <button className="submit-review-btn" onClick={handleSubmitReview}>
                        Submit Review
                    </button>

                    {adminReview.reviewedAt && (
                        <div className="last-review">
                            <small>Last reviewed: {new Date(adminReview.reviewedAt).toLocaleString()}</small>
                            <p>Status: <strong>{adminReview.decision}</strong></p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminCase;
