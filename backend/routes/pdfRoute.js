const express = require("express");
const router = express.Router();

const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");

const Case = require("../models/Case");

router.get("/hearing/:caseId", async (req, res) => {

  const caseId = req.params.caseId;

  const caseData = await Case.findOne({ caseId })
    .populate("citizenId")
    .populate("lawyerId")
    .populate("policeId");

  if (!caseData) return res.status(404).send("Case not found");

  let template = fs.readFileSync(
    path.join(__dirname, "../templates/hearingTemplate.html"),
    "utf8"
  );

  const hearings = caseData.hearings || [];

  const hearingRows = hearings.map((h, i) => `

<tr>
<td>Hearing ${i + 1}</td>
<td>${new Date(h.hearingDate).toLocaleString()}</td>
<td>${i + 3}</td>
</tr>

`).join("");

  const hearingPages = hearings.map((h, i) => `

<div class="hearing">

<h2>Hearing ${i + 1}</h2>

<p><b>Date:</b> ${new Date(h.hearingDate).toLocaleString()}</p>

<p><b>Decision:</b> ${h.judgeDecision || "Pending"}</p>

<p><b>Judge Reasoning</b></p>
<p>${h.judgementText || "Not provided"}</p>

<div style="margin-top: 20px;">
  <p><b>Courtroom Statements</b></p>
  ${h.messages && h.messages.length > 0 ? `
  <table class="case-table">
    <tr>
      <th>User Role</th>
      <th>Time</th>
      <th>Statement</th>
    </tr>
    ${h.messages.map(m => `
<tr>
  <td><b>${(m.sender || "UNKNOWN").toUpperCase()}</b></td>
  <td>${m.time || ""}</td>
  <td>${m.text || ""}</td>
</tr>
`).join("")}
  </table>
  ` : `<p><i>No statements were recorded during this hearing.</i></p>`}
</div>

</div>

`).join("");

  template = template
    .replace("{{caseId}}", caseData.caseId)
    .replace("{{title}}", caseData.title || "")
    .replace("{{caseType}}", caseData.caseType || "")
    .replace("{{citizen}}", caseData.citizenId?.name || "")
    .replace("{{opponent}}", caseData.opponent?.name || "")
    .replace("{{lawyer}}", caseData.lawyerId?.name || "")
    .replace("{{police}}", caseData.policeId?.name || "")
    .replace("{{hearingRows}}", hearingRows)
    .replace("{{hearingPages}}", hearingPages);

  const browser = await puppeteer.launch();

  const page = await browser.newPage();

  await page.setContent(template);

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true
  });

  await browser.close();

  res.set({
    "Content-Type": "application/pdf",
    "Content-Length": pdf.length
  });

  res.send(pdf);

});

module.exports = router;