const fs = require('fs');
const files = ['src/db.ts', 'src/handlers/import.ts', 'src/handlers/website_import.ts', 'src/utils/importer.ts'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\\`/g, '\`');
  fs.writeFileSync(file, content);
}
console.log("Fixed backticks.");
