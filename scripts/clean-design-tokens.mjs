import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

function cleanTokens(classStr) {
  let tokens = classStr.split(/\s+/).filter(Boolean);
  let newTokens = [];

  for (let token of tokens) {
    const baseToken = token.replace(/^(?:[a-z0-9_-]+:)+/, '');

    // 1. Borders
    if (baseToken === 'border' || baseToken.startsWith('border-') || baseToken.startsWith('divide-')) {
      continue;
    }
    // 2. Rounded corners
    if (baseToken === 'rounded' || baseToken.startsWith('rounded-')) {
      continue;
    }
    // 3. Shadows
    if (baseToken === 'shadow' || baseToken.startsWith('shadow-') || baseToken.startsWith('drop-shadow-')) {
      continue;
    }
    // 4. Rings & Outlines
    if (baseToken === 'ring' || baseToken.startsWith('ring-') || baseToken === 'outline' || baseToken.startsWith('outline-')) {
      continue;
    }
    // 5. Backgrounds (allow only bg-white and bg-transparent)
    if (baseToken.startsWith('bg-') && baseToken !== 'bg-white' && baseToken !== 'bg-transparent') {
      continue;
    }
    // 6. Monospaced font
    if (baseToken === 'font-mono') {
      continue;
    }
    // 7. Typography mapping
    if (/^text-(xs|sm|\[8px\]|\[9px\]|\[9\.5px\]|\[10px\]|\[10\.5px\]|\[11px\]|\[11\.5px\]|\[12px\]|\[12\.5px\]|\[13px\])$/.test(baseToken)) {
      token = token.replace(baseToken, 'text-small');
    } else if (/^text-(lg|xl|2xl|\[18px\]|\[20px\]|\[24px\])$/.test(baseToken)) {
      token = token.replace(baseToken, 'text-title');
    } else if (/^text-(3xl|4xl|5xl|6xl|7xl|\[30px\]|\[32px\]|\[36px\]|\[40px\]|\[48px\])$/.test(baseToken)) {
      token = token.replace(baseToken, 'text-display');
    } else if (/^text-(base|\[16px\])$/.test(baseToken)) {
      token = token.replace(baseToken, 'text-body');
    }

    // Font mapping
    if (baseToken === 'font-editorial') {
      token = token.replace(baseToken, 'font-serif');
    } else if (baseToken === 'font-sans' || baseToken === 'font-grotesk') {
      continue; // default font is grotesk
    }

    newTokens.push(token);
  }

  return newTokens.join(' ');
}

const files = walk('src');
let modifiedCount = 0;

for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  const original = content;

  // Handle template literals and quotes inside JSX / ternary expressions
  content = content.replace(/(['"`])([^'"`\n]*(?:border|rounded|shadow|font-mono|divide|bg-|ring|outline)[^'"`\n]*)(['"`])/g, (match, q1, str, q2) => {
    // If it looks like code / import / url, leave it
    if (str.includes('/') && (str.includes('.ts') || str.includes('.js') || str.includes('http') || str.includes('supabase'))) {
      return match;
    }
    const cleaned = cleanTokens(str);
    return q1 + cleaned + q2;
  });

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    modifiedCount++;
  }
}

console.log(`Cleaned design tokens across ${modifiedCount} files in src/`);
