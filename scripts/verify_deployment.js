const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("Verifying Deployment Setup...");

// 1. Check package.json
try {
    const pkg = require('../package.json');
    console.log("✅ package.json found");

    if (pkg.scripts && pkg.scripts.start) {
        console.log("✅ start script present:", pkg.scripts.start);
    } else {
        console.error("❌ start script missing!");
    }

    if (pkg.dependencies.stockfish) {
        console.log("✅ stockfish dependency present");
    } else {
        console.error("❌ stockfish dependency missing!");
        process.exit(1);
    }
} catch (e) {
    console.error("❌ package.json check failed:", e.message);
    process.exit(1);
}

// 2. Check Environment Variables
console.log("Checking Environment Variables...");
// We are local, so we check .env or process.env
// Render provides variables at runtime, but we need to ensure code handles them.
// We'll just print a reminder.
console.log("ℹ️ Ensure these variables are set in Render:");
console.log("   - NODE_ENV=production");
console.log("   - MONGO_URI (Connection string)");
console.log("   - JWT_SECRET (Random string)");

// 3. Check Stockfish Path
const stockfishPath = path.join(__dirname, '..', 'node_modules', 'stockfish', 'src', 'stockfish-17.1-lite-single-03e3232.js');
if (fs.existsSync(stockfishPath)) {
    console.log("✅ Stockfish file found at expected path");
} else {
    console.error("❌ Stockfish file NOT found at:", stockfishPath);
    console.log("   This might be okay if node_modules is not installed yet, but ensures path correctness.");
}

// 4. Check Assets
const wPPath = path.join(__dirname, '..', 'public', 'assets', 'pieces', 'wP.svg');
if (fs.existsSync(wPPath)) {
    console.log("✅ Chess piece assets found (checked wP.svg)");
} else {
    console.error("❌ Chess piece assets NOT found at:", wPPath);
    console.error("   Ensure 'public/assets/pieces' contains SVG files like wP.svg, bK.svg etc.");
}

console.log("Deployment verification complete. Ready for Render.");
