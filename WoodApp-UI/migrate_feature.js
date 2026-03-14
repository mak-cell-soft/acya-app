const fs = require('fs');
const path = require('path');

const srcAppDir = path.join(__dirname, 'src', 'app');
const oldFeaturePath = path.join(srcAppDir, 'dashboard');
const newFeaturePath = path.join(srcAppDir, 'features', 'dashboard');

// 1. Move all files from components/articles to features/articles
function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(element => {
        const fromPath = path.join(from, element);
        const toPath = path.join(to, element);
        if (fs.lstatSync(fromPath).isDirectory()) {
            copyFolderSync(fromPath, toPath);
        } else {
            fs.copyFileSync(fromPath, toPath);
        }
    });
}

if (fs.existsSync(oldFeaturePath)) {
    copyFolderSync(oldFeaturePath, newFeaturePath);
    console.log('Copied components to features');
}

// Map old absolute paths to new absolute paths
const moveMap = new Map();
moveMap.set(oldFeaturePath.replace(/\\/g, '/'), newFeaturePath.replace(/\\/g, '/'));

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
walk(srcAppDir, (filePath) => {
  if (!extensions.includes(path.extname(filePath))) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  const filePathUnix = filePath.replace(/\\/g, '/');
  const isInsideMovedDir = filePathUnix.startsWith(newFeaturePath.replace(/\\/g, '/'));

  const importRegex = /(import.*?from\s+['"])(.*?)(['"])/g;
  content = content.replace(importRegex, (match, p1, p2, p3) => {
    // Resolve the absolute path of the import
    if (p2.startsWith('.')) {
      
      let oldDirPath = path.dirname(filePath);
      
      if (isInsideMovedDir) {
           oldDirPath = oldDirPath.replace(path.join('features', 'dashboard'), 'dashboard');
      }
      
      let absoluteTarget = path.resolve(oldDirPath, p2).replace(/\\/g, '/');
      
      for (const [oldPath, newPath] of moveMap.entries()) {
        if (absoluteTarget.startsWith(oldPath)) {
          absoluteTarget = absoluteTarget.replace(oldPath, newPath);
          break;
        }
      }
      
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

if (fs.existsSync(oldFeaturePath)) {
    fs.rmSync(oldFeaturePath, { recursive: true, force: true });
    console.log('Deleted old components/articles');
}
