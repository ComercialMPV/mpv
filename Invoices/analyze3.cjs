const fs=require('fs');
const lines=fs.readFileSync('d:/projects/2026/App Compliance/Invoices/src/pages/CompanyEdit.tsx','utf8').split('\n');
let open=0;
for(let i=0;i<lines.length;i++){
  const line=lines[i];
  const opens=(line.match(/<div\b/g) || []).length;
  const closes=(line.match(/<\/div>/g) || []).length;
  if(opens>0 || closes>0){
    open += opens - closes;
    console.log(i+1, 'open', opens, 'close', closes, 'balance', open);
  }
}
console.log('remaining divs',open);
