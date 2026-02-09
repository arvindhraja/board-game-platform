const fs = require('fs');
const https = require('https');
const path = require('path');

const pieces = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];
const baseURL = 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/';
const destDir = path.join(__dirname, '../public/assets/pieces');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

pieces.forEach(piece => {
    const url = `${baseURL}${piece}.svg`;
    const dest = path.join(destDir, `${piece}.svg`);

    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`Downloaded ${piece}.svg`);
        });
    }).on('error', (err) => {
        fs.unlink(dest);
        console.error(`Error downloading ${piece}.svg: ${err.message}`);
    });
});
