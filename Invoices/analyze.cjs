const fs = require('fs');
const lines = fs.readFileSync('d:/projects/2026/App Compliance/Invoices/src/templates/public-portal/variants/ModernPortal.tsx', 'utf8').split('\n');
let paren = 0, brace = 0, bracket = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let c of line) {
        if (c === '(') paren++;
        if (c === ')') paren--;
        if (c === '{') brace++;
        if (c === '}') brace--;
        if (c === '[') bracket++;
        if (c === ']') bracket--;
    }
    if (paren !== 0 || brace !== 0 || bracket !== 0) {
        console.log('line', i+1, 'p b br', paren, brace, bracket, '->', line.trim());
    }
}
console.log('final', paren, brace, bracket);
