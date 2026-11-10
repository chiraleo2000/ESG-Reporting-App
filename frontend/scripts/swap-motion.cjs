const fs = require('fs');
const path = require('path');

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (/\.(tsx|ts)$/.test(ent.name)) {
      const text = fs.readFileSync(full, 'utf8');
      const next = text.replace(/from 'framer-motion'/g, "from '@/lib/motion'");
      if (next !== text) {
        fs.writeFileSync(full, next);
        console.log(full);
      }
    }
  }
}

walk(path.join(__dirname, '..', 'src'));
