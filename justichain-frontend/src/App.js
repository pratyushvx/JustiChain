import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CitizenDashboard from "./pages/CitizenDashboard";
import RegisterCase from "./pages/RegisterCase";
import PoliceDashboard from "./pages/PoliceDashboard";
import LawyerDashboard from "./pages/LawyerDashboard";
import JudgeAccess from "./pages/JudgeAccess";
import JudgeDashboard from "./pages/JudgeDashboard";
import Courtroom from "./pages/Courtroom";
import OpponentEntry from "./pages/OpponentEntry";
import HearingHistory from "./pages/HearingHistory";
import AdminCase from "./pages/AdminCase";

// NEW PAGES
import HearingPDF from "./pages/HearingPDF";
import SocialPost from "./pages/SocialPost";

function App() {
  const path = window.location.pathname;

  // 🔓 Public pages
  if (path === "/") return <Login />;
  if (path === "/register") return <Register />;

  // 👤 Citizen
  if (path === "/citizen") return <CitizenDashboard />;
  if (path === "/register-case") return <RegisterCase />;

  // 👮 Police
  if (path === "/police") return <PoliceDashboard />;

  // ⚖️ Lawyer
  if (path === "/lawyer") return <LawyerDashboard />;

  // 👨‍⚖️ Judge
  if (path === "/judge-access") return <JudgeAccess />;
  if (path === "/judge") return <JudgeDashboard />;

  // 🧑 Opponent
  if (path === "/opponent") return <OpponentEntry />;

  // 🏛️ Courtroom (dynamic)
  if (path.startsWith("/courtroom/")) return <Courtroom />;

  // 📜 Hearing History
  if (path.startsWith("/hearings/")) return <HearingHistory />;

  // 🧾 Hearing PDF page (NEW)
  if (path.startsWith("/hearing-pdf/")) return <HearingPDF />;

  // 📢 Social Media Post page (NEW)
  if (path.startsWith("/social-post/")) return <SocialPost />;

  // 🛡️ Admin Review
  if (path.startsWith("/admin/case/")) return <AdminCase />;

  // 🗂 Legacy
  if (path === "/dashboard") return <Dashboard />;

  // 🔁 Fallback
  return <Login />;
}

export default App;