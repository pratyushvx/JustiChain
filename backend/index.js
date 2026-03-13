const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);


// 📁 Ensure uploads folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}


// CORS (important for cookies)
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));


app.use(express.json());
app.use(cookieParser());


// =========================
// ROUTES
// =========================

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/protected", require("./routes/protected.routes"));

app.use("/api/citizen", require("./routes/citizen.routes"));
app.use("/api/police", require("./routes/police.routes"));
app.use("/api/lawyer", require("./routes/lawyer.routes"));
app.use("/api/judge", require("./routes/judge.routes"));

app.use("/api/case", require("./routes/case.routes"));
app.use("/api/evidence", require("./routes/evidence.routes"));

app.use("/api/admin", require("./routes/admin.routes"));

// NEW FEATURES
app.use("/api/pdf", require("./routes/pdfRoute"));
app.use("/api/social", require("./routes/socialRoute"));


// 📂 Serve uploaded files
app.use("/uploads", express.static("uploads"));


// =========================
// DATABASE
// =========================

mongoose.connect("mongodb://127.0.0.1:27017/justichain1")
.then(() => {
  console.log("✅ MongoDB Connected");
})
.catch(err => {
  console.error("❌ MongoDB Error:", err);
});


// =========================
// SOCKET.IO
// =========================

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// make io accessible in routes
app.set("io", io);


// courtroom socket logic
require("./socket/courtroom.socket")(io);


// =========================
// SERVER
// =========================

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} with Socket.IO`);
});