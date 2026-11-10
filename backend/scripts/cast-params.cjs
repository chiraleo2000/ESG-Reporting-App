const fs = require('fs');
const path = require('path');

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (ent.name.endsWith('.ts') && !ent.name.endsWith('.d.ts')) {
      const text = fs.readFileSync(full, 'utf8');
      if (!text.includes('req.params')) continue;
      const next = text.replace(/req\.params/g, '(req.params as Record<string, string>)');
      if (next !== text) {
        fs.writeFileSync(full, next);
        console.log(full);
      }
    }
  }
}

walk(path.join(__dirname, '..', 'src'));
