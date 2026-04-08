const fs = require('fs');
const axios = require('axios');

const log = fs.readFileSync('./test.log', 'utf8');
axios.post('http://localhost:5678/webhook/test-agent', { rawLog: log, task: 'log' })
  .then(response => {
    console.log("Log uploaded successfully:", response.data);
  })
  .then(() => console.log("🔍 Error log sent for analysis."))
  .catch(err => console.error("Upload failed"));