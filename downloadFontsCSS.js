const https = require('https');
const fs = require('fs');
const path = require('path');

const fonts = [
  "EB+Garamond", "Lora", "Libre+Baskerville", "Montserrat", "Raleway", 
  "Open+Sans", "Dancing+Script", "Pinyon+Script", "Old+Standard+TT", "Oswald"
];

const destFolder = path.join(__dirname, 'public', 'fonts');

function request(url, options) {
  return new Promise((resolve, reject) => {
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, function(response) {
      response.pipe(file);
      file.on('finish', () => resolve());
    }).on('error', reject);
  });
}

(async () => {
  for (const family of fonts) {
    try {
      // Force TTF via old Android User-Agent
      const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;
      const options = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36' } }; // Maybe TTF or woff? Let's check format
      
      const css = await request(cssUrl, options);
      
      // Parse CSS
      // We want to find standard (font-style: normal, font-weight: 400)
      // And download that TTF.
      const nameWithoutSpaces = family.replace(/\+/g, '');
      
      // Find normal regular
      const regularMatch = css.match(/font-style:\s*normal;\s*font-weight:\s*400;[\s\S]*?src:\s*url\((.*?)\)/);
      if (regularMatch && regularMatch[1]) {
        await downloadFile(regularMatch[1], path.join(destFolder, `${nameWithoutSpaces}-Regular.ttf`));
        console.log(`Downloaded ${nameWithoutSpaces}-Regular.ttf`);
      }
      
      // Find italic
      const italicMatch = css.match(/font-style:\s*italic;\s*font-weight:\s*400;[\s\S]*?src:\s*url\((.*?)\)/);
      if (italicMatch && italicMatch[1]) {
        await downloadFile(italicMatch[1], path.join(destFolder, `${nameWithoutSpaces}-Italic.ttf`));
      }
      
      // Find bold
      const boldMatch = css.match(/font-style:\s*normal;\s*font-weight:\s*700;[\s\S]*?src:\s*url\((.*?)\)/);
      if (boldMatch && boldMatch[1]) {
        await downloadFile(boldMatch[1], path.join(destFolder, `${nameWithoutSpaces}-Bold.ttf`));
      }

      // Find bold italic
      const boldItalicMatch = css.match(/font-style:\s*italic;\s*font-weight:\s*700;[\s\S]*?src:\s*url\((.*?)\)/);
      if (boldItalicMatch && boldItalicMatch[1]) {
        await downloadFile(boldItalicMatch[1], path.join(destFolder, `${nameWithoutSpaces}-BoldItalic.ttf`));
      }
      
    } catch (e) {
      console.error(`Failed ${family}`, e.message);
    }
  }
})();
