const mongoose = require("mongoose");
const Evidence = require("../models/Evidence");

const caseIdToCheck = "JC-LD-123456-2026-0007";

mongoose.connect("mongodb://127.0.0.1:27017/justichain1")
  .then(async () => {
    console.log("Connected to DB");
    const evidences = await Evidence.find({ caseId: caseIdToCheck });
    console.log(`Found ${evidences.length} evidence documents`);

    evidences.forEach((ev, i) => {
      console.log(`\n--- Evidence ${i+1} ---`);
      console.log("uploaderRole:", ev.uploaderRole);
      console.log("status:", ev.status);
      console.log("authenticityScore:", ev.mlScores?.authenticityScore);
    });

    mongoose.disconnect();
  })
  .catch(err => console.error(err));