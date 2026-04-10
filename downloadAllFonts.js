const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsToDownload = [
  'eb-garamond', 'lora', 'libre-baskerville', 'montserrat', 'raleway', 'open-sans', 'dancing-script', 'pinyon-script', 'old-standard-tt', 'oswald'
];

const destFolder = path.join(__dirname, 'public', 'fonts');

function getApi(id) {
  return new Promise((resolve, reject) => {
    https.get(`https://gwfh.mranv.com/api/fonts/${id}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

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
  for (const f of fontsToDownload) {
    try {
      console.log(`Getting metadata for ${f}...`);
      const data = await getApi(f);
      // Find normal font variant
      const variant = data.variants.find(v => v.id === 'regular' || v.id === '400') || data.variants[0];
      const ttfUrl = variant.ttf;
      
      const p = path.join(destFolder, `${data.family.replace(/\s+/g, '')}-Regular.ttf`);
      console.log(`Downloading TTF for ${f} -> ${p}`);
      await download(ttfUrl, p);
      console.log(`Saved ${data.family}`);
    } catch (e) {
      console.error(`Failed ${f}`, e);
    }
  }
})();
