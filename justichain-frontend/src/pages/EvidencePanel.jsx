import axios from "axios";
import { useEffect, useState } from "react";

function EvidencePanel({ caseId }) {
  const [evidenceList, setEvidenceList] = useState([]);

  useEffect(() => {
    fetchEvidence();
  }, [caseId]);

  const fetchEvidence = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/evidence/${caseId}`,
        { withCredentials: true }
      );
      setEvidenceList(res.data.evidence || []);
    } catch (err) {
      console.error("Error fetching evidence");
    }
  };

  /* ================= SINGLE VALIDATION CLICK ================= */

  const handleValidate = async (evidence) => {
    try {
      await axios.post(
        "http://localhost:5000/api/evidence/click-action",
        { evidenceId: evidence._id },
        { withCredentials: true }
      );

      fetchEvidence(); // refresh after validation
    } catch (err) {
      console.error("Validation error");
    }
  };

  /* ================= UI ================= */

  return (
    <div>
      <h3>Evidence Files</h3>

      {evidenceList.length === 0 ? (
        <p>No evidence uploaded.</p>
      ) : (
        evidenceList.map((ev) => (
          <div
            key={ev._id}
            onClick={() => handleValidate(ev)}
            style={{
              padding: "12px",
              marginBottom: "10px",
              borderRadius: "8px",
              cursor: "pointer",
              border:
                ev.status === "WRONG_DOCUMENT"
                  ? "2px solid red"
                  : ev.status === "VERIFIED_CORRECT"
                  ? "2px solid green"
                  : "1px solid #ccc",
              transition: "all 0.3s ease",
              background: "#fff"
            }}
          >
            📄 {ev.fileName || "Statement"}
            <br />
            <strong>Status:</strong> {ev.status}
          </div>
        ))
      )}
    </div>
  );
}

export default EvidencePanel;