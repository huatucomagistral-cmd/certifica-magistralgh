const https = require('https');
const fs = require('fs');
const path = require('path');

const fonts = [
  { name: "EBGaramond-Regular", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/EBGaramond-Regular.ttf" },
  { name: "Lora-Regular", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/lora/Lora-Regular.ttf" },
  { name: "LibreBaskerville-Regular", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/librebaskerville/LibreBaskerville-Regular.ttf" },
  { name: "Montserrat-Regular", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat-Regular.ttf" },
  { name: "Raleway-Regular", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/raleway/Raleway-Regular.ttf" },
  { name: "OpenSans-Regular", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/OpenSans-Regular.ttf" },
  { name: "DancingScript-Regular", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/DancingScript-Regular.ttf" },
  { name: "PinyonScript-Regular", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/pinyonscript/PinyonScript-Regular.ttf" },
  { name: "OldStandardTT-Regular", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/oldstandardtt/OldStandard-Regular.ttf" },
  { name: "Oswald-Regular", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/oswald/Oswald-Regular.ttf" },
  { name: "EBGaramond-Italic", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/EBGaramond-Italic.ttf" },
  { name: "EBGaramond-Bold", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/EBGaramond-Bold.ttf" },
  { name: "EBGaramond-BoldItalic", url: "https://raw.githubusercontent.com/google/fonts/main/ofl/ebgaramond/EBGaramond-BoldItalic.ttf" }
];

const destFolder = path.join(__dirname, 'public', 'fonts');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, function(response) {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, function(redirectResponse) {
          redirectResponse.pipe(file);
          file.on('finish', () => resolve());
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => resolve());
      }
    }).on('error', reject);
  });
}

(async () => {
  for (const f of fonts) {
    try {
      const p = path.join(destFolder, `${f.name}.ttf`);
      console.log(`Downloading TTF for ${f.name}...`);
      await download(f.url, p);
      console.log(`Saved ${f.name}`);
    } catch (e) {
      console.error(`Failed ${f.name}`, e);
    }
  }
})();
