const Case = require("../models/Case");
const CourtroomSession = require("../models/CourtroomSession");

const activeSpeaker = {}; // { roomId: role }

module.exports = (io) => {
  io.on("connection", (socket) => {

    /* ================= JOIN ================= */
    socket.on(
      "join_courtroom",
      async ({ caseId, role, userId, opponentEmail }) => {
        try {
          const c = await Case.findOne({ caseId });

          // ❌ Case or courtroom not ready
          if (!c || !c.courtroomOpen || !c.courtRoomId) {
            return socket.emit("join_error", "Courtroom closed");
          }

          // ✅ NEW: ensure an active hearing exists
          const hearing = c.hearings.find(h => h.isOpen);
          if (!hearing) {
            return socket.emit("join_error", "No active hearing");
          }

          let allowed = false;

          if (role === "judge" || role === "admin") allowed = true;

          if (
            role === "citizen" &&
            String(c.citizenId) === String(userId)
          ) allowed = true;

          if (
            role === "lawyer" &&
            String(c.lawyerId) === String(userId)
          ) allowed = true;

          if (
            role === "police" &&
            String(c.policeId) === String(userId)
          ) allowed = true;

          // ✅ FIXED OPPONENT LOGIC
          if (role === "opponent") {
            if (!opponentEmail) {
              return socket.emit(
                "join_error",
                "Opponent email missing"
              );
            }

            if (
              !c.opponent ||
              c.opponent.email !== opponentEmail
            ) {
              return socket.emit(
                "join_error",
                "Unauthorized opponent"
              );
            }

            allowed = true;
          }

          if (!allowed) {
            return socket.emit("join_error", "Unauthorized");
          }

          // ✅ JOIN ROOM
          socket.join(c.courtRoomId);
          socket.roomId = c.courtRoomId;
          socket.role = role;

          if (!activeSpeaker[c.courtRoomId]) {
            activeSpeaker[c.courtRoomId] = null;
          }

          const msg = {
            sender: "SYSTEM",
            text: `${role.toUpperCase()} joined the courtroom`,
            time: new Date().toLocaleTimeString()
          };

          hearing.messages.push(msg);
          await c.save();

          io.to(c.courtRoomId).emit("system_message", msg);

        } catch (err) {
          console.error("Socket join error:", err);
          socket.emit("join_error", "Server error");
        }
      }
    );

    /* ================= SPEAKER CONTROL ================= */
    socket.on("set_speaker", async ({ speaker }) => {
      if (socket.role !== "judge") return;

      activeSpeaker[socket.roomId] = speaker;

      const c = await Case.findOne({ courtRoomId: socket.roomId });
      if (!c) return;

      const hearing = c.hearings.find(h => h.isOpen);
      if (!hearing) return;

      const msg = {
        sender: "SYSTEM",
        text: speaker
          ? `Judge allowed ${speaker.toUpperCase()} to speak`
          : "Judge muted everyone",
        time: new Date().toLocaleTimeString()
      };

      hearing.messages.push(msg);
      await c.save();

      io.to(socket.roomId).emit("speaker_changed", { speaker });
      io.to(socket.roomId).emit("system_message", msg);
    });

    /* ================= CHAT ================= */
    socket.on("send_message", async ({ text }) => {
      if (!text || !socket.roomId) return;

      const allowed = activeSpeaker[socket.roomId];
      if (socket.role !== "judge" && socket.role !== allowed) return;

      const message = {
        sender: socket.role,
        text,
        time: new Date().toLocaleTimeString()
      };

      const c = await Case.findOne({ courtRoomId: socket.roomId });
      if (!c) return;

      const hearing = c.hearings.find(h => h.isOpen);
      if (!hearing) return;

      hearing.messages.push(message);
      await c.save();

      // ✅ UPDATE COURTROOM SESSION
      try {
        const activeSession = await CourtroomSession.findOne({ caseId: c._id, isActive: true });
        if (activeSession) {
          activeSession.statements.push({
            from: socket.role === "judge" ? "JUDGE" :
              socket.role === "citizen" ? "CITIZEN" :
                socket.role === "lawyer" ? "LAWYER" :
                  socket.role === "police" ? "POLICE" : "SYSTEM",
            text: text
          });
          await activeSession.save();

          io.to(socket.roomId).emit("CASE_UPDATE", {
            statements: activeSession.statements,
            evidenceScores: activeSession.evidenceSnapshot
          });
        }
      } catch (err) {
        console.error("Session message error:", err);
      }

      io.to(socket.roomId).emit("new_message", message);
    });

    /* ================= DISCONNECT ================= */
    socket.on("disconnect", () => {
      if (socket.roomId) {
        io.to(socket.roomId).emit("system_message", {
          sender: "SYSTEM",
          text: `${socket.role?.toUpperCase()} left the courtroom`,
          time: new Date().toLocaleTimeString()
        });
      }
    });
  });
};
