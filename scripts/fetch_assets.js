const fs = require('fs');
const https = require('https');
const path = require('path');

// Lichess uses CamelCase (wP, wN, etc.)
// We want to map these to lowercase for local usage (wp.svg, wn.svg) to match chess.js output
const pieces = {
    'wP': 'wp', 'wN': 'wn', 'wB': 'wb', 'wR': 'wr', 'wQ': 'wq', 'wK': 'wk',
    'bP': 'bp', 'bN': 'bn', 'bB': 'bb', 'bR': 'br', 'bQ': 'bq', 'bK': 'bk'
};
const baseURL = 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/';
const destDir = path.join(__dirname, '../public/assets/pieces');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

Object.entries(pieces).forEach(([srcName, destName]) => {
    const url = `${baseURL}${srcName}.svg`;
    const dest = path.join(destDir, `${destName}.svg`);

    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`Downloaded ${destName}.svg`);
        });
    }).on('error', (err) => {
        fs.unlink(dest);
        console.error(`Error downloading ${destName}.svg: ${err.message}`);
    });
});
