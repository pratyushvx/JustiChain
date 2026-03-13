import { useEffect, useState } from "react";
import axios from "axios";
import styles from "../styles/HearingHistory.module.css";

function HearingHistory() {

  const caseId = window.location.pathname.split("/")[2];

  const [hearings, setHearings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {

    axios.get(
      `http://localhost:5000/api/case/hearings/${caseId}`,
      { withCredentials: true }
    )
    .then(res => {

      setHearings(res.data || []);
      setLoading(false);

    })
    .catch(err => {

      console.error(err);
      setError("Failed to load hearing history");
      setLoading(false);

    });

  }, [caseId]);


  const getDecisionClass = (decision) => {

    if (!decision) return styles.decisionPending;
    if (decision.includes("WIN")) return styles.decisionWin;
    if (decision.includes("LOSS")) return styles.decisionLoss;
    if (decision.includes("NEXT")) return styles.decisionNext;

    return styles.decisionPending;

  };


  const getMessageClass = (sender) => {

    switch(sender?.toLowerCase()) {

      case 'judge': return styles.messageJudge;
      case 'citizen': return styles.messageCitizen;
      case 'lawyer': return styles.messageLawyer;
      case 'police': return styles.messagePolice;
      case 'opponent': return styles.messageOpponent;
      default: return '';

    }

  };


  const getSenderIcon = (sender) => {

    switch(sender?.toLowerCase()) {

      case 'judge': return '👨‍⚖️';
      case 'citizen': return '👤';
      case 'lawyer': return '⚖️';
      case 'police': return '👮';
      case 'opponent': return '⚔️';
      default: return '👤';

    }

  };


  // 📄 OPEN PDF IN NEW TAB
  const openPDF = () => {

    window.open(
      `http://localhost:5000/api/pdf/hearing/${caseId}`,
      "_blank"
    );

  };


  // 📢 SOCIAL POST PAGE
  const openSocialPost = () => {

    window.location.href = `/social-post/${caseId}`;

  };


  if (loading) {

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Loading Hearing History...</h2>
        </div>
      </div>
    );

  }


  return (

    <div className={styles.container}>

      <button
        className={styles.backButton}
        onClick={() => window.history.back()}
      >
        Back to Courtroom
      </button>


      <div className={styles.header}>

        <h2>Hearing History</h2>

        <div className={styles.caseIdBadge}>
          Case ID: {caseId}
        </div>


        <div style={{marginTop:"10px"}}>

          <button
            onClick={openPDF}
            style={{
              padding:"8px 14px",
              marginRight:"10px",
              background:"#2563eb",
              color:"white",
              border:"none",
              borderRadius:"6px",
              cursor:"pointer"
            }}
          >
            📄 View PDF
          </button>


          <button
            onClick={openSocialPost}
            style={{
              padding:"8px 14px",
              background:"#16a34a",
              color:"white",
              border:"none",
              borderRadius:"6px",
              cursor:"pointer"
            }}
          >
            📢 Post To Social Media
          </button>

        </div>

      </div>



      <div className={styles.hearingsContainer}>


        {error && (

          <div className={styles.emptyState}>
            <p style={{ color: '#dc2626' }}>❌ {error}</p>
          </div>

        )}


        {!error && hearings.length === 0 && (

          <div className={styles.emptyState}>
            <p>No hearings have been conducted for this case yet.</p>

            <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
              The judge will schedule hearings and record proceedings here.
            </p>

          </div>

        )}


        {hearings.map((h, idx) => (

          <div key={h.hearingId || idx} className={styles.hearingCard}>


            <div className={styles.hearingNumber}>
              Hearing {idx + 1} of {hearings.length}
            </div>


            <div className={styles.hearingInfo}>


              <div className={styles.infoItem}>

                <span className={styles.infoLabel}>Date:</span>

                <span className={styles.dateValue}>

                  {h.hearingDate
                    ? new Date(h.hearingDate).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : "Not Scheduled"}

                </span>

              </div>


              <div className={styles.infoItem}>

                <span className={styles.infoLabel}>Decision:</span>

                <span className={`${styles.decisionValue} ${getDecisionClass(h.judgeDecision)}`}>
                  {h.judgeDecision || "Pending"}
                </span>

              </div>

            </div>



            {h.judgementText && (

              <div className={styles.judgeOrder}>

                <div className={styles.judgeOrderTitle}>
                  Judge's Order & Reasoning
                </div>

                <div className={styles.judgeOrderText}>
                  {h.judgementText}
                </div>

              </div>

            )}



            <div className={styles.statementsSection}>

              <div className={styles.statementsTitle}>

                Courtroom Statements

                <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                  ({h.messages?.length || 0} statements)
                </span>

              </div>



              {(!h.messages || h.messages.length === 0) ? (

                <div className={styles.noStatements}>
                  No statements were recorded during this hearing.
                </div>

              ) : (

                <div className={styles.messageList}>

                  {h.messages?.map((m, i) => (

                    <div key={i} className={`${styles.messageItem} ${getMessageClass(m.sender)}`}>

                      <div className={styles.messageSender}>

                        <span className={styles.senderIcon}>
                          {getSenderIcon(m.sender)}
                        </span>

                        <span className={styles.senderName}>
                          {m.sender?.toUpperCase() || "Unknown"}
                        </span>

                      </div>

                      <div className={styles.messageText}>
                        {m.text}
                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </div>

        ))}

      </div>

    </div>

  );

}

export default HearingHistory;