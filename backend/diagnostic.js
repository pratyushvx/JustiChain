const mongoose = require("mongoose");
const Case = require("./models/Case");
const User = require("./models/User");

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/justichain");

async function diagnose() {
    try {
        console.log("\n🔍 COURTROOM DIAGNOSTIC REPORT\n" + "=".repeat(50));

        const cases = await Case.find()
            .populate("citizenId", "name email")
            .populate("lawyerId", "name email")
            .populate("policeId", "name email")
            .sort({ createdAt: -1 });

        if (cases.length === 0) {
            console.log("⚠️  No cases found in database");
            process.exit(0);
        }

        cases.forEach((c, index) => {
            console.log(`\n📋 Case ${index + 1}: ${c.caseId}`);
            console.log("-".repeat(50));
            console.log(`Title: ${c.title}`);
            console.log(`Status: ${c.status}`);
            console.log(`Citizen: ${c.citizenId?.name || "N/A"} (${c.citizenId?.email || "N/A"})`);
            console.log(`Lawyer: ${c.lawyerId?.name || "N/A"}`);
            console.log(`Police: ${c.policeId?.name || "N/A"}`);
            console.log(`Opponent: ${c.opponent?.name || "N/A"} (${c.opponent?.email || "N/A"})`);

            console.log(`\n🔑 COURTROOM STATE:`);
            console.log(`  courtroomOpen: ${c.courtroomOpen}`);
            console.log(`  courtRoomId: ${c.courtRoomId || "NOT SET"}`);
            console.log(`  courtAccessPassword: ${c.courtAccessPassword || "NOT SET"}`);
            console.log(`  hearingDate: ${c.hearingDate ? new Date(c.hearingDate).toLocaleString() : "NOT SET"}`);

            console.log(`\n📅 HEARINGS (${c.hearings.length} total):`);
            if (c.hearings.length === 0) {
                console.log("  ⚠️  No hearings scheduled");
            } else {
                c.hearings.forEach((h, idx) => {
                    console.log(`  ${idx + 1}. ${h.hearingId || "NO_ID"}`);
                    console.log(`     Date: ${h.hearingDate ? new Date(h.hearingDate).toLocaleString() : "NOT SET"}`);
                    console.log(`     isOpen: ${h.isOpen}`);
                    console.log(`     courtRoomId: ${h.courtRoomId || "NOT SET"}`);
                    console.log(`     Messages: ${h.messages?.length || 0}`);
                    console.log(`     Decision: ${h.judgeDecision || "PENDING"}`);
                    if (h.isOpen) {
                        console.log(`     ⚠️  THIS IS THE ACTIVE HEARING`);
                    }
                });
            }

            const activeHearing = c.hearings.find(h => h.isOpen);

            console.log(`\n✅ VALIDATION CHECKS:`);
            console.log(`  Case exists: ✓`);
            console.log(`  courtroomOpen flag: ${c.courtroomOpen ? "✓" : "✗"}`);
            console.log(`  courtRoomId exists: ${c.courtRoomId ? "✓" : "✗"}`);
            console.log(`  Active hearing exists: ${activeHearing ? "✓" : "✗"}`);

            if (c.courtroomOpen && c.courtRoomId && activeHearing) {
                console.log(`\n🎉 COURTROOM READY TO JOIN!`);
            } else {
                console.log(`\n⚠️  COURTROOM NOT READY - Missing:`);
                if (!c.courtroomOpen) console.log(`    - courtroomOpen flag is false`);
                if (!c.courtRoomId) console.log(`    - courtRoomId not set`);
                if (!activeHearing) console.log(`    - No active hearing (isOpen=true)`);
            }
        });

        console.log("\n" + "=".repeat(50));
        console.log("✅ Diagnostic complete\n");

    } catch (error) {
        console.error("❌ Error running diagnostic:", error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

diagnose();
