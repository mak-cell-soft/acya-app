const fs = require('fs');
const path = require('path');
const resultsPath = path.join(__dirname, 'scan-results.json');
const agentMdPath = path.join(__dirname, '../Agent.md');

// 1. Clean the old section out of Agent.md
const agentStr = fs.readFileSync(agentMdPath, 'utf8');
const lines = agentStr.split('\n');
const startH8 = lines.findIndex(l => l.includes('## 8. Component Tree'));
let cleanedLines = lines;
if (startH8 !== -1) {
    cleanedLines = lines.slice(0, startH8);
}

// 2. Build the new section
const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

let md = `\n## 8. Component Tree\n\n\`\`\`text\nsrc/app/\n`;

function buildTreeMd(paths) {
    const root = {};
    for (let item of paths) {
        // file path like 'components/articles/add-article/add-article.component.ts'
        const parts = item.file.split('/');
        let current = root;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = item;
    }

    let out = '';
    function traverse(node, prefix = '') {
        const keys = Object.keys(node);
        keys.forEach((k, index) => {
            const isLast = index === keys.length - 1;
            const marker = isLast ? '└── ' : '├── ';
            
            if (node[k] && node[k].file) {
                // Leaf
                const comp = node[k];
                const baseName = k.replace('.component.ts', '');
                const tag = `[${comp.smart}]`;
                out += `${prefix}${marker}${k}        # ${tag}\n`;
                out += `${prefix}${isLast ? '    ' : '│   '}├── ${baseName}.component.html\n`;
                out += `${prefix}${isLast ? '    ' : '│   '}└── ${baseName}.component.css\n`;
            } else {
                // Dir
                out += `${prefix}${marker}${k}/\n`;
                traverse(node[k], prefix + (isLast ? '    ' : '│   '));
            }
        });
    }
    traverse(root);
    return out;
}

md += buildTreeMd(data);
md += `\`\`\`\n\n`;

md += `\n| Component | Type | Module | Routed? | Description |\n`;
md += `|-----------|------|--------|---------|-------------|\n`;

for (const comp of data) {
    let moduleGuessed = "AppModule";
    if (comp.file.includes('articles/')) moduleGuessed = "AppModule (Articles)";
    if (comp.file.includes('merchandise/')) moduleGuessed = "AppModule (Merchandise)";
    if (comp.file.includes('customers/')) moduleGuessed = "AppModule (Customers)";
    if (comp.file.includes('providers/')) moduleGuessed = "AppModule (Providers)";
    if (comp.file.includes('stock/')) moduleGuessed = "AppModule (Stock)";

    const routedMark = comp.routed ? '✅' : '❌';
    let typeMark = comp.smart;
    if (comp.standalone) {
        typeMark += ' (Standalone)';
    }

    const compCode = fs.readFileSync(comp.path, 'utf8');
    const classMatch = compCode.match(/export class (\w+Component)/);
    const className = classMatch ? classMatch[1] : comp.name;

    const desc = comp.smart === 'Smart' 
        ? 'Handles logic, API calls, and state selection.' 
        : 'Pure presentation component, receives data via @Input() and emits via @Output().';

    md += `| ${className} | ${typeMark} | ${moduleGuessed} | ${routedMark} | ${desc} |\n`;
}

// 3. Write back
const newAgentStr = cleanedLines.join('\n') + md;
fs.writeFileSync(agentMdPath, newAgentStr, 'utf8');
console.log('Fixed Agent.md');
