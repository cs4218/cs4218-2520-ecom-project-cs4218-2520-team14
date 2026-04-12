// Chia York Lim, A0258147X
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function shipAndProcess() {
  try {
    const log = fs.readFileSync('./test.log', 'utf8');
    console.log("🔍 Shipping log for analysis...");
    const response = await axios.post('http://localhost:5678/webhook/test-agent', { rawLog: log, task: 'log' });

    if (response.status !== 200) {
      console.error("Failed to ship log. Status code:", response.status);
      return;
    }

    let failures = response.data?.text;
    failures = JSON.parse(failures);
    console.log(failures);

    if (!Array.isArray(failures) || failures.length === 0) {
      console.log("✅ No issues found in the log.");
      return;
    } else {
      console.log("❌ Issues found in the log:");
      for (const failure of failures) {
        const source = fs.readFileSync(failure.sourceFile, 'utf8');
        const test = fs.readFileSync(failure.testFile, 'utf8');
        const res = await axios.post('http://localhost:5678/webhook/test-agent', {
          task: 'logfix',
          sourceCode: source,
          testCode: test,
          issue: failure.why,
          action: failure.action
        });

        const fixedCode = res.data.text;
        const targetPath = `aigen/logfix/${failure.testFile}`;
        const targetDir = path.dirname(targetPath);

        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.writeFileSync(targetPath, fixedCode, 'utf8');
        console.log(`✅ Fixed code written to ${targetPath}`);
      }

    }
  } catch (error) {
    console.error("Error occurred while processing the log:", error);
  }
}

shipAndProcess();