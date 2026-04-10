const fs = require('fs');
const filePath = 'src/app/(admin)/admin/dashboard/certificados/nuevo/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');
// Replace all \" with "
content = content.replace(/\\"/g, '"');
fs.writeFileSync(filePath, content);
console.log('Fixed quotes in', filePath);
