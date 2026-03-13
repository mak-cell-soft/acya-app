const fs = require('fs');
const path = require('path');

const rootDir = __dirname + '/app';
const result = [];

function scanDir(dir, prefix = '') {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath, prefix + file + '/');
    } else if (fullPath.endsWith('.component.ts')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('@Component')) {
        const hasService = content.includes('Service') || content.includes('Store<') || content.includes('HttpClient') || content.includes('inject(');
        const hasInputOutput = content.includes('@Input(') || content.includes('@Output(');
        const isStandalone = content.includes('standalone: true');
        result.push({
          file: prefix + file,
          name: file.replace('.component.ts', ''),
          smart: hasService ? 'Smart' : 'Dumb',
          standalone: isStandalone,
          routed: false, // We'll guess this based on app-routing next
          path: fullPath
        });
      }
    }
  }
}

scanDir(rootDir);

const routesContent = fs.readFileSync(path.join(rootDir, 'app-routing.module.ts'), 'utf-8');
for (const comp of result) {
    // Basic routing guess
    const classNameMatch = fs.readFileSync(comp.path, 'utf8').match(/export class (\w+)/);
    if (classNameMatch && routesContent.includes(classNameMatch[1])) {
        comp.routed = true;
    }
}

fs.writeFileSync(__dirname + '/scan-results.json', JSON.stringify(result, null, 2));
console.log('Done scanning ' + result.length + ' components.');
