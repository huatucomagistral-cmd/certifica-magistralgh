const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsToDownload = [
  { name: 'PlayfairDisplay-Italic.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/static/PlayfairDisplay-Italic.ttf' },
  { name: 'PlayfairDisplay-Bold.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/static/PlayfairDisplay-Bold.ttf' },
  { name: 'PlayfairDisplay-BoldItalic.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/static/PlayfairDisplay-BoldItalic.ttf' },
];

const dir = path.join(__dirname, 'public', 'fonts');

fontsToDownload.forEach(font => {
  const dest = path.join(dir, font.name);
  const file = fs.createWriteStream(dest);
  https.get(font.url, function(response) {
    if(response.statusCode === 200) {
      response.pipe(file);
      file.on('finish', function() {
        console.log('Downloaded: ' + font.name);
        file.close();
      });
    } else {
      console.log('Failed to download: ' + font.name + ' - ' + response.statusCode);
      file.close();
    }
  }).on('error', function(err) {
    console.error('Error downloading ' + font.name, err.message);
  });
});
