// import axios from "axios";
// import { useState } from "react";

// function RegisterCase() {
//   const [form, setForm] = useState({
//     title: "",
//     description: "",
//     caseType: "",
//     opponentName: "",
//     opponentEmail: ""
//   });

//   const submit = async () => {
//     await axios.post(
//       "http://localhost:5000/api/citizen/register-case",
//       {
//         title: form.title,
//         description: form.description,
//         caseType: form.caseType,
//         opponent: {
//           name: form.opponentName,
//           email: form.opponentEmail
//         }
//       },
//       { withCredentials: true }
//     );

//     window.location.href = "/citizen";
//   };

//   return (
//     <div style={{ padding: "30px" }}>
//       <h2>Register Case</h2>

//       <input placeholder="Title" onChange={e => setForm({ ...form, title: e.target.value })} />
//       <input placeholder="Case Type" onChange={e => setForm({ ...form, caseType: e.target.value })} />
//       <textarea placeholder="Description"
//         onChange={e => setForm({ ...form, description: e.target.value })} />

//       <h4>Opponent Details</h4>
//       <input placeholder="Name"
//         onChange={e => setForm({ ...form, opponentName: e.target.value })} />
//       <input placeholder="Email"
//         onChange={e => setForm({ ...form, opponentEmail: e.target.value })} />

//       <button onClick={submit}>Submit Case</button>
//     </div>
//   );
// }

// export default RegisterCase;
