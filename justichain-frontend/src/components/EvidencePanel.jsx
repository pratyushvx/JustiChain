import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../styles/evidence.css";

const EvidencePanel = ({ caseId, role, isOpen }) => {
    const clickTimer = useRef(null);
    const CLICK_DELAY = 250; // ms
    const [evidenceList, setEvidenceList] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);

    // Upload State
    const [file, setFile] = useState(null);
    const [type, setType] = useState("PDF");
    const [desc, setDesc] = useState("");
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (caseId) loadEvidence();
    }, [caseId, isOpen]);

    const loadEvidence = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`http://localhost:5000/api/evidence/${caseId}`, {
                withCredentials: true
            });
            setEvidenceList(res.data.evidence);
            setSummary(res.data.summary);
        } catch (err) {
            console.error("Failed to load evidence", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file && type !== "STATEMENT") return alert("Please select a file");

        const formData = new FormData();
        formData.append("caseId", caseId);
        formData.append("type", type);
        formData.append("description", desc);
        if (file) formData.append("file", file);

        try {
            setUploading(true);
            await axios.post("http://localhost:5000/api/evidence/upload", formData, {
                withCredentials: true
            });

            alert("Evidence uploaded & processed by ML!");
            setFile(null);
            setDesc("");
            loadEvidence(); // Refresh list
        } catch (err) {
            alert("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    // Click handling logic
    const handleCardClick = async (evidenceItem, clickType) => {
        if (clickType === 'single') {
            // start timer for single click
            clickTimer.current = setTimeout(async () => {
                await sendClickAction(evidenceItem._id, 'single');
            }, CLICK_DELAY);
        } else if (clickType === 'double') {
            // double click cancels single click timer
            clearTimeout(clickTimer.current);
            await sendClickAction(evidenceItem._id, 'double');
        }
    };

    const sendClickAction = async (evidenceId, action) => {
        try {
            const res = await axios.post('http://localhost:5000/api/evidence/click-action',
                { evidenceId, action },
                { withCredentials: true }
            );
            const updated = res.data.evidence;
            setEvidenceList(prev => prev.map(item => item._id === updated._id ? updated : item));
        } catch (err) {
            console.error('Click action failed', err);
        }
    };

    return (
        <div className="evidence-panel">

            {/* HEADER WITH STATS */}
            <div className="evidence-header">
                <h3>🔎 Evidence & AI Analysis</h3>
                <div style={{ textAlign: 'right', fontSize: '13px', color: '#64748b' }}>
                    <span>Total: <b>{summary.totalEvidence || 0}</b></span> |
                    <span> Avg Score: <b style={{ color: summary.highRiskFlags ? 'red' : 'green' }}>{summary.avgEvidenceScore || 0}</b></span>
                </div>
            </div>

            {/* UPLOAD ZONE (Only for participants) */}
            <div className="upload-zone">
                <h4>📤 Submit New Evidence</h4>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '15px' }}>System will automatically verify authenticity via ML</p>

                <form onSubmit={handleUpload}>
                    <div className="upload-inputs">
                        <select value={type} onChange={(e) => setType(e.target.value)}>
                            <option value="PDF">Document (PDF)</option>
                            <option value="IMAGE">Image (JPG/PNG)</option>
                            <option value="STATEMENT">Text Statement</option>
                        </select>

                        {type !== "STATEMENT" && (
                            <input
                                type="file"
                                onChange={(e) => setFile(e.target.files[0])}
                                accept={type === 'PDF' ? '.pdf' : 'image/*'}
                            />
                        )}

                        <input
                            type="text"
                            placeholder="Brief Description / Statement"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            required
                            style={{ flex: 1 }}
                        />

                        <button type="submit" className="btn-upload" disabled={uploading}>
                            {uploading ? "Analyzing..." : "Upload & Analyze"}
                        </button>
                    </div>
                </form>
            </div>

            {/* EVIDENCE LIST */}
            <div className="evidence-grid">
                {loading && <p>Loading evidence...</p>}
                {!loading && evidenceList.length === 0 && <p className="text-center">No evidence submitted yet.</p>}

                {evidenceList.map((e) => (
                    <div key={e._id}
                        className={`evidence-card ${e.status === 'WRONG_DOCUMENT' ? 'status-wrong_document' : e.status === 'VERIFIED_CORRECT' ? 'status-verified_correct' : ''}`}
                        onClick={() => handleCardClick(e, 'single')}
                        onDoubleClick={() => handleCardClick(e, 'double')}>
                        {/* STATUS BADGE */}
                        <div className={`status-indicator status-${e.status.toLowerCase()}`}>
                            {e.status}
                        </div>

                        {/* PREVIEW */}
                        <div className="evidence-preview">
                            {e.type === 'PDF' ? '📄' : e.type === 'IMAGE' ? '🖼️' : '📝'}
                        </div>

                        {/* CONTENT */}
                        <div className="evidence-info">
                            <h4>{e.description || "No description"}</h4>
                            <div className="meta-badges">
                                <span className={`badge ${e.type.toLowerCase()}`}>{e.type}</span>
                                <span className="badge">{e.uploadedBy?.role || "Unknown"}</span>
                            </div>

                            {/* AI SCORE BOX */}
                            <div className="ml-score-box">
                                <div className="score-row">
                                    <span>Authenticity</span>
                                    <span>{Math.round((e.mlScores?.authenticityScore || 0) * 100)}%</span>
                                </div>
                                <div className="score-row">
                                    <span>Consistency</span>
                                    <span>{Math.round((e.mlScores?.consistencyScore || 0) * 100)}%</span>
                                </div>
                                <div className="main-score">
                                    <span>AI TRUST SCORE</span>
                                    <span>{e.mlScores?.finalEvidenceScore || 0} / 1.0</span>
                                </div>
                            </div>

                            <div style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                                {e.filePath && (
                                    <a href={`http://localhost:5000/${e.filePath}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>
                                        View File
                                    </a>
                                )}
                                <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
};

export default EvidencePanel;
