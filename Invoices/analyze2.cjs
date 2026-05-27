const fs=require('fs');
const lines=fs.readFileSync('d:/projects/2026/App Compliance/Invoices/src/pages/CompanyEdit.tsx','utf8').split('\n');
let open=0;
for(let i=0;i<lines.length;i++){
  const line=lines[i];
  const opens=(line.match(/<div\b/g) || []).length;
  const closes=(line.match(/<\/div>/g) || []).length;
  open += opens - closes;
  if(open<0){
    console.log('negative at',i+1,line);
    open=0;
  }
}
console.log('remaining divs',open);
