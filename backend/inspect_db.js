const mongoose = require("mongoose");
const Case = require("./models/Case");

mongoose.connect("mongodb://127.0.0.1:27017/justichain").then(async () => {
    console.log("Connected to DB");
    
    // Find all cases
    const cases = await Case.find();
    console.log(`Found ${cases.length} cases.`);
    
    require('fs').writeFileSync('out_all_cases.json', JSON.stringify(cases, null, 2));
    console.log("Written to out_all_cases.json");
    
    process.exit(0);
});
