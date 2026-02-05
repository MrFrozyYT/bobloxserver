const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// --- DATABASE ---
const mongoURI = "mongodb+srv://admin:boblox123@bobloxserver.nc5xodv.mongodb.net/?appName=bobloxserver";
mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.log("❌ DB Error:", err));

// --- SCHEMAS ---
const Announcement = mongoose.model('Announcement', new mongoose.Schema({ text: String, active: Boolean }));
const User = mongoose.model('User', new mongoose.Schema({ username: String, password: String, isAdmin: Boolean }));

// --- ROUTES ---

// 1. FIX "CANNOT GET /"
app.get('/', (req, res) => {
    res.send("<h1>Boblox Server is Running!</h1><p>Status: Online</p>");
});

// 2. Health Check
app.get('/health', (req, res) => res.status(200).send('OK'));

// 3. API Routes
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

// --- KEEP ALIVE (Your Render URL) ---
const LIVE_URL = "https://bobloxserver.onrender.com/health";

setInterval(() => {
    console.log("Pinging server to keep awake...");
    https.get(LIVE_URL, (res) => {
        console.log(`Ping Status: ${res.statusCode}`);
    }).on('error', (e) => console.error(e.message));
}, 600000); // 10 minutes

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
