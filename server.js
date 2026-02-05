const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Increase limit to 50mb to allow uploading big game files
app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- DATABASE ---
// (I hid your password for safety - paste your real link back here!)
const mongoURI = "mongodb+srv://admin:boblox123@bobloxserver.nc5xodv.mongodb.net/?appName=bobloxserver";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.log("❌ DB Error:", err));

// --- SCHEMAS ---
const Announcement = mongoose.model('Announcement', new mongoose.Schema({ text: String, active: Boolean }));
const User = mongoose.model('User', new mongoose.Schema({ username: String, password: String, isAdmin: Boolean }));

// NEW: Game Schema for the Publish Button
const Game = mongoose.model('Game', new mongoose.Schema({ 
    name: String, 
    creator: String, 
    data: String, // This stores the Base64 game save
    plays: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
}));

// --- ROUTES ---

// 1. Root Status
app.get('/', (req, res) => {
    res.json({ message: "Boblox Website API Online", status: "Active" });
});

// 2. Health Check
app.get('/health', (req, res) => res.status(200).send('OK'));

// 3. Announcement Routes
app.get('/api/announcement', async (req, res) => {
    const ann = await Announcement.findOne({ active: true });
    res.json(ann || { text: "" });
});

app.post('/api/announcement', async (req, res) => {
    const { text } = req.body;
    await Announcement.deleteMany({});
    const newAnn = new Announcement({ text, active: true });
    await newAnn.save();
    res.json({ message: "Updated" });
});

app.delete('/api/announcement', async (req, res) => {
    await Announcement.deleteMany({});
    res.json({ message: "Removed" });
});

// 4. Auth Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const exists = await User.findOne({ username });
        if(exists) return res.json({ success: false, message: "User exists" });
        const newUser = new User({ username, password, isAdmin: (username === "MrFrozy") });
        await newUser.save();
        res.json({ success: true });
    } catch(e) { res.json({ success: false, error: e.message }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if(user) res.json({ success: true, user: { username: user.username, isAdmin: user.isAdmin } });
    else res.json({ success: false, message: "Invalid credentials" });
});

// --- NEW ROUTES FOR PUBLISHING & WEBSITE ---

// 5. Publish Game (For C# Client)
app.post('/api/publish', async (req, res) => {
    console.log("📥 Publish Request Received");
    const { name, creator, data } = req.body;

    try {
        // Update existing game or create new
        let game = await Game.findOne({ name: name, creator: creator });
        
        if (game) {
            game.data = data;
            game.lastUpdated = Date.now();
            await game.save();
            console.log("🔄 Game Updated:", name);
        } else {
            game = new Game({ name, creator, data });
            await game.save();
            console.log("✨ New Game Published:", name);
        }
        res.json({ success: true, message: "Published successfully" });
    } catch (e) {
        console.error("Publish Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 6. Get All Games (For home.html)
app.get('/api/games', async (req, res) => {
    const games = await Game.find().select('-data'); // Don't send heavy save data to list
    res.json(games);
});

// 7. Stats for Website
app.get('/api/players', async (req, res) => {
    const count = await User.countDocuments();
    res.json({ count: count + 100 }); // Fake "active" count based on registered users
});

app.get('/api/game/stats', async (req, res) => {
    // Return stats for the most recently updated game
    const game = await Game.findOne().sort({ lastUpdated: -1 });
    if(game) {
        res.json({ likes: game.likes, favorites: game.favorites, visits: game.plays });
    } else {
        res.json({ likes: 0, favorites: 0, visits: 0 });
    }
});

// --- KEEP ALIVE ---
const LIVE_URL = "https://bobloxserver.onrender.com/health";

setInterval(() => {
    console.log("Pinging server to keep awake...");
    https.get(LIVE_URL, (res) => {
        console.log(`Ping Status: ${res.statusCode}`);
    }).on('error', (e) => console.error(e.message));
}, 600000); 

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
