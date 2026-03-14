const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src', 'app', 'features', 'dashboard');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk(targetDir, (filePath) => {
  if (filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let relativePath = path.relative(targetDir, path.dirname(filePath));
    let relativeDepth = relativePath === '' ? 0 : relativePath.split(path.sep).length;
    
    let neededLevels = 2 + relativeDepth;
    
    const patterns = ['shared', 'services', 'guards', 'models', 'store', 'constants', 'authentication'];
    
    patterns.forEach(p => {
        const regex = new RegExp(`(['"])(\\.\\.\\/)+${p}`, 'g');
        content = content.replace(regex, (match, quote) => {
            let levels = '../'.repeat(neededLevels);
            return `${quote}${levels}${p}`;
        });
    });

    fs.writeFileSync(filePath, content);
  }
});
