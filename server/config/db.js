const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // New Mongoose default is simplified, these are often deprecated but good for older versions explicitly
            // useNewUrlParser: true, 
            // useUnifiedTopology: true,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        console.error('Make sure MONGO_URI is set in .env');
        // process.exit(1); // Don't exit on dev, just warn
    }
};

module.exports = connectDB;
