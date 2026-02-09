const fs = require('fs');
const https = require('https');
const path = require('path');

const sounds = {
    'move.mp3': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/Move.mp3',
    'capture.mp3': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/Capture.mp3',
    'check.mp3': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/Check.mp3', // Placeholder
    'game-start.mp3': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/GenericNotify.mp3',
    'game-end.mp3': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/Victory.mp3',
    // We'll reuse 'move.mp3' for carrom strike, maybe capture for pocket.
    'strike.mp3': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/Move.mp3', // reused
    'pocket.mp3': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/sound/standard/Capture.mp3' // reused
};

const destDir = path.join(__dirname, '../public/assets/sounds');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

Object.entries(sounds).forEach(([filename, url]) => {
    const dest = path.join(destDir, filename);
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`Downloaded ${filename}`);
        });
    }).on('error', (err) => {
        fs.unlink(dest);
        console.error(`Error downloading ${filename}: ${err.message}`);
    });
});
