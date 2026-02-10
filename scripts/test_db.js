const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGO_URI;

if (!uri || uri.includes('<password>')) {
    console.error('❌ ERROR: Please update your .env file with a valid MongoDB URI!');
    console.error('   Currently using: ' + (uri || 'Nothing'));
    console.error('   See MONGODB_SETUP_GUIDE.md for instructions.');
    process.exit(1);
}

console.log('🔄 Attempting to connect to MongoDB...');
console.log(`   URI: ${uri.substring(0, 20)}...`); // Hide password for security

mongoose.connect(uri)
    .then(() => {
        console.log('✅ SUCCESS! Connected to Database.');
        console.log('   You can now start the server with: npm start');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ CONNECTION FAILED:');
        console.error(err.message);

        if (err.message.includes('bad auth')) {
            console.log('\n💡 Tip: Check your username and password in the URI.');
        } else if (err.message.includes('whitelist') || err.message.includes('network')) {
            console.log('\n💡 Tip: Did you whitelist your IP address in MongoDB Atlas? (Network Access > Allow Access from Anywhere)');
        }

        process.exit(1);
    });
