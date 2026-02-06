const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Increase limit to 50mb
app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- DATABASE ---
const mongoURI = "mongodb+srv://admin:boblox123@bobloxserver.nc5xodv.mongodb.net/?appName=bobloxserver";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.log("❌ DB Error:", err));

// --- SCHEMAS ---
const Announcement = mongoose.model('Announcement', new mongoose.Schema({ text: String, active: Boolean }));
const User = mongoose.model('User', new mongoose.Schema({ username: String, password: String, isAdmin: Boolean }));

const Game = mongoose.model('Game', new mongoose.Schema({ 
    name: String, 
    creator: String, 
    data: String, 
    plays: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
}));

// --- ROUTES ---
app.get('/', (req, res) => { res.json({ message: "Boblox API Online", status: "Active" }); });
app.get('/health', (req, res) => res.status(200).send('OK'));

// Announcement
app.get('/api/announcement', async (req, res) => { const ann = await Announcement.findOne({ active: true }); res.json(ann || { text: "" }); });
app.post('/api/announcement', async (req, res) => { const { text } = req.body; await Announcement.deleteMany({}); const newAnn = new Announcement({ text, active: true }); await newAnn.save(); res.json({ message: "Updated" }); });
app.delete('/api/announcement', async (req, res) => { await Announcement.deleteMany({}); res.json({ message: "Removed" }); });

// Auth
app.post('/api/register', async (req, res) => { try { const { username, password } = req.body; const exists = await User.findOne({ username }); if(exists) return res.json({ success: false, message: "User exists" }); const newUser = new User({ username, password, isAdmin: (username === "MrFrozy") }); await newUser.save(); res.json({ success: true }); } catch(e) { res.json({ success: false, error: e.message }); } });
app.post('/api/login', async (req, res) => { const { username, password } = req.body; const user = await User.findOne({ username, password }); if(user) res.json({ success: true, user: { username: user.username, isAdmin: user.isAdmin } }); else res.json({ success: false, message: "Invalid credentials" }); });

// Publish
app.post('/api/publish', async (req, res) => {
    console.log("📥 Publish Request Received");
    const { name, creator, data } = req.body;
    try {
        let game = await Game.findOne({ name: name, creator: creator });
        if (game) { game.data = data; game.lastUpdated = Date.now(); await game.save(); console.log("🔄 Game Updated:", name); } 
        else { game = new Game({ name, creator, data }); await game.save(); console.log("✨ New Game Published:", name); }
        res.json({ success: true, message: "Published successfully" });
    } catch (e) { console.error("Publish Error:", e); res.status(500).json({ success: false, error: e.message }); }
});

// --- FIX HERE: REMOVED .select('-data') SO MAP LOADS ---
app.get('/api/games', async (req, res) => {
    const games = await Game.find(); 
    res.json(games);
});

// Stats
app.get('/api/players', async (req, res) => { const count = await User.countDocuments(); res.json({ count: count + 100 }); });
app.get('/api/game/stats', async (req, res) => { const game = await Game.findOne().sort({ lastUpdated: -1 }); if(game) { res.json({ likes: game.likes, favorites: game.favorites, visits: game.plays }); } else { res.json({ likes: 0, favorites: 0, visits: 0 }); } });

// Keep Alive
setInterval(() => { https.get("https://bobloxserver.onrender.com/health", (res) => { console.log(`Ping: ${res.statusCode}`); }).on('error', (e) => console.error(e.message)); }, 600000); 

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
