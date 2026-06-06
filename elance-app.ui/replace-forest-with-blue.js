const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('src');
let changed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace 'forest' with 'corp-blue' in classes and strings
  content = content.replace(/forest-/g, 'corp-blue-');
  
  // Replace any 'forest' color usages that don't have a dash, like bg-forest (wait, Tailwind classes usually have dashes, e.g. text-forest-600)
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    changed++;
  }
});

console.log('Replaced forest with corp-blue in files: ' + changed);
