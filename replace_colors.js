const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // globals.css exceptions
  if (file.endsWith('globals.css')) {
    content = content.replace(/--color-primary: #02367B;/g, '--color-primary: #4338ca;');
    content = content.replace(/--color-secondary: #0A192F;/g, '--color-secondary: #14b8a6;');
  }

  // General replacements for primary hex inline classes
  content = content.replace(/bg-\[\#02367B\]/g, 'bg-primary');
  content = content.replace(/text-\[\#02367B\]/g, 'text-primary');
  content = content.replace(/border-\[\#02367B\]/g, 'border-primary');
  content = content.replace(/fill-\[\#02367B\]/g, 'fill-primary');
  content = content.replace(/ring-\[\#02367B\]/g, 'ring-primary');

  // Replace hover states with hex
  content = content.replace(/hover:bg-\[\#012d68\]/g, 'hover:bg-indigo-800');
  content = content.replace(/hover:text-\[\#012d68\]/g, 'hover:text-indigo-800');
  
  // Also any remaining raw strings
  content = content.replace(/#02367B/g, '#4338ca');
  content = content.replace(/#012d68/g, '#3730a3');

  // Replace blue colors with indigo broadly
  content = content.replace(/\bblue-50\b/g, 'indigo-50');
  content = content.replace(/\bblue-100\b/g, 'indigo-100');
  content = content.replace(/\bblue-200\b/g, 'indigo-200');
  content = content.replace(/\bblue-300\b/g, 'indigo-300');
  content = content.replace(/\bblue-400\b/g, 'indigo-400');
  content = content.replace(/\bblue-500\b/g, 'indigo-500');
  content = content.replace(/\bblue-600\b/g, 'indigo-600');
  content = content.replace(/\bblue-700\b/g, 'indigo-700');
  content = content.replace(/\bblue-800\b/g, 'indigo-800');
  content = content.replace(/\bblue-900\b/g, 'indigo-900');
  content = content.replace(/\bblue-950\b/g, 'indigo-950');

  // Replace primary actions to secondary (teal) for calls to action
  // Currently the site is mostly blue/indigo. We want the "secondary" (teal-500) to show up!
  // I will leave this string replacement only up to here!

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated: ' + file);
  }
});
