import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

function HearingPDF() {

  const { caseId } = useParams();

  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {

    if (!caseId) return;

    let objectUrl;

    const fetchPDF = async () => {

      try {

        const res = await axios.get(
          `http://localhost:5000/api/pdf/hearing/${caseId}`,
          { responseType: "blob" }
        );

        objectUrl = window.URL.createObjectURL(res.data);
        setPdfUrl(objectUrl);

      } catch (err) {

        console.error("Failed to load PDF:", err);
        setError("Failed to load hearing report.");

      } finally {

        setLoading(false);

      }

    };

    fetchPDF();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

  }, [caseId]);

  return (

    <div style={{ padding: "30px", fontFamily: "Arial" }}>

      <h2 style={{ marginBottom: "20px" }}>
        JustiChain Court Hearing Report
      </h2>

      {loading && <p>Generating PDF report...</p>}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {pdfUrl && !loading && (

        <>
          <div style={{ marginBottom: "15px" }}>

            <a
              href={pdfUrl}
              download={`hearing_${caseId}.pdf`}
              style={{
                marginRight: "15px",
                padding: "8px 12px",
                background: "#2c3e50",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px"
              }}
            >
              Download PDF
            </a>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "8px 12px",
                background: "#34495e",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px"
              }}
            >
              Open in New Tab
            </a>

          </div>

          <iframe
            src={pdfUrl}
            width="100%"
            height="750px"
            style={{
              border: "1px solid #ccc",
              borderRadius: "6px"
            }}
            title="Hearing PDF"
          />

        </>

      )}

    </div>

  );

}

export default HearingPDF;