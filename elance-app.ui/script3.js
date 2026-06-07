const fs = require('fs');
const path = require('path');
function walkSync(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.tsx')) {
      filelist.push(dirFile);
    }
  }
  return filelist;
}
const files = walkSync('src/components');
let modifiedFiles = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  let buttonRegex = /<Button[\s\S]*?onClick=\{onClose\}[\s\S]*?>[\s\S]*?<X[\s\S]*?<\/Button>/g;
  content = content.replace(buttonRegex, (match) => {
    if (!match.includes('rounded-full')) {
      return match.replace(/className=\"(.*?)\"/, 'className=\"$1 rounded-full\"');
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Modified: ' + file);
    modifiedFiles++;
  }
}
console.log('Total modified: ' + modifiedFiles);
