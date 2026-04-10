const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay-Italic%5Bwght%5D.ttf';
const dest = path.join(__dirname, 'public', 'fonts', 'PlayfairDisplay-Italic.ttf');

const file = fs.createWriteStream(dest);

https.get(url, function(response) {
  if (response.statusCode === 302 || response.statusCode === 301) {
    https.get(response.headers.location, function(redirectResponse) {
      redirectResponse.pipe(file);
      file.on('finish', () => console.log('Downloaded Italic to ' + dest));
    });
  } else {
    response.pipe(file);
    file.on('finish', () => console.log('Downloaded Italic to ' + dest));
  }
});
