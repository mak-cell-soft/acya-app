const fs = require('fs');
const path = require('path');

const srcAppDir = path.join(__dirname, 'src', 'app');

const filesToMove = [
  'confirm-delete-modal',
  'sales-site-modal',
  'payment-modal',
  'add-transporter-modal',
  'add-lengths-modal',
  'generic-confirmation-modal'
].map(m => ({
  oldPath: path.join(srcAppDir, 'dashboard', 'modals', m),
  newPath: path.join(srcAppDir, 'shared', 'components', 'modals', m)
}));

// Create target dir
const targetDir = path.join(srcAppDir, 'shared', 'components', 'modals');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Map old absolute paths of .ts folders to new absolute paths
const moveMap = new Map();
for(const rule of filesToMove) {
  if (fs.existsSync(rule.oldPath)) {
    // don't move just yet, let's build the map
    moveMap.set(rule.oldPath.replace(/\\/g, '/'), rule.newPath.replace(/\\/g, '/'));
  }
}

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
const extensions = ['.ts'];
walk(srcAppDir, (filePath) => {
  if (!extensions.includes(path.extname(filePath))) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const importRegex = /(import.*?from\s+['"])(.*?)(['"])/g;
  content = content.replace(importRegex, (match, p1, p2, p3) => {
    // Resolve the absolute path of the import
    if (p2.startsWith('.')) {
      const absoluteImportPath = path.resolve(path.dirname(filePath), p2).replace(/\\/g, '/');
      
      // Check if this import goes into one of our moved folders
      for (const [oldPath, newPath] of moveMap.entries()) {
        if (absoluteImportPath.startsWith(oldPath)) {
          // It's importing something from the moved folder!
          // Replace oldPath with newPath in the absolute path
          const updatedAbsolutePath = absoluteImportPath.replace(oldPath, newPath);
          // Calculate new relative path
          let newRelativePath = path.relative(path.dirname(filePath), updatedAbsolutePath).replace(/\\/g, '/');
          if (!newRelativePath.startsWith('.')) {
            newRelativePath = './' + newRelativePath;
          }
          changed = true;
          return p1 + newRelativePath + p3;
        }
      }
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated imports in', filePath);
  }
});

// Now move the directories
for(const rule of filesToMove) {
  if (fs.existsSync(rule.oldPath)) {
    // Copy then delete is safer
    try {
        fs.cpSync(rule.oldPath, rule.newPath, { recursive: true });
        fs.rmSync(rule.oldPath, { recursive: true, force: true });
        console.log('Successfully moved', rule.oldPath);
    } catch(e) {
        console.error('Failed to move ', rule.oldPath, e);
    }

  }
}
