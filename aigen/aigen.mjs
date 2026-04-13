// Chia York Lim, A0258147X
import { execSync } from 'child_process';

const [task, directory, filename] = process.argv.slice(2);

const body = JSON.stringify({ task, directory, filename });

execSync(
  `curl -X POST http://localhost:5678/webhook/test-agent -H "Content-Type: application/json" -d "${body.replace(/"/g, '\\"')}"`,
  { stdio: 'inherit' }
);

// To run this script, use the command:
// npm run aigen -- <task> <directory> <filename>
// For example:
// npm run aigen -- "fix" "controllers/" "authController.js"
//
// Task: fix / expand