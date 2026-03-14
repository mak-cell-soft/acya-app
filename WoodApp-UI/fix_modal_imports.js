const fs = require('fs');
const path = require('path');

const srcAppDir = path.join(__dirname, 'src', 'app');
const modalsDir = path.join(srcAppDir, 'shared', 'components', 'modals');

// Function to walk dirs
function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

// Rewrite imports
const extensions = ['.ts', '.html'];
walk(modalsDir, (filePath) => {
  if (!extensions.includes(path.extname(filePath))) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const importRegex = /(import.*?from\s+['"])(.*?)(['"])/g;
  content = content.replace(importRegex, (match, p1, p2, p3) => {
    // Resolve the absolute path of the import
    if (p2.startsWith('.')) {
      // The old path was relative to dashboard/modals. It moved one level deeper.
      // So what was ../../../ is now ../../../../
      // Let's resolve what it WOULD have been from the OLD path
      const oldDirPath = path.dirname(filePath).replace('shared\\components\\modals', 'dashboard\\modals');
      const absoluteTarget = path.resolve(oldDirPath, p2).replace(/\\/g, '/');
      
      // Calculate new relative path from NEW path to the target
      let newRelativePath = path.relative(path.dirname(filePath), absoluteTarget).replace(/\\/g, '/');
      if (!newRelativePath.startsWith('.')) {
        newRelativePath = './' + newRelativePath;
      }
      
      if (newRelativePath !== p2) {
          changed = true;
          return p1 + newRelativePath + p3;
      }
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed imports in', filePath);
  }
});
