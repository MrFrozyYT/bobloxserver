const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const https = require('https'); // Used for self-ping

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// --- MONGODB CONNECTION ---
// I added the connection string you provided
const mongoURI = "mongodb+srv://admin:boblox123@bobloxserver.nc5xodv.mongodb.net/?appName=bobloxserver";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// --- SCHEMAS ---
const AnnouncementSchema = new mongoose.Schema({ text: String, active: Boolean });
const Announcement = mongoose.model('Announcement', AnnouncementSchema);

const UserSchema = new mongoose.Schema({ 
    username: { type: String, unique: true }, 
    password: String, 
    isAdmin: Boolean 
});
const User = mongoose.model('User', UserSchema);

// --- ROUTES ---

// Health Check (Used by the self-ping)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// 1. GET Announcement
app.get('/api/announcement', async (req, res) => {
    const ann = await Announcement.findOne({ active: true });
    res.json(ann || { text: "" });
});

// 2. POST Announcement (Admin)
app.post('/api/announcement', async (req, res) => {
    const { text } = req.body;
    await Announcement.deleteMany({});
    const newAnn = new Announcement({ text, active: true });
    await newAnn.save();
    res.json({ message: "Updated" });
});

// 3. DELETE Announcement
app.delete('/api/announcement', async (req, res) => {
    await Announcement.deleteMany({});
    res.json({ message: "Removed" });
});

// 4. REGISTER
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

// 5. LOGIN
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if(user) res.json({ success: true, user: { username: user.username, isAdmin: user.isAdmin } });
    else res.json({ success: false, message: "Invalid credentials" });
});

// --- SERVER KEEP-ALIVE (PREVENTS RENDER SLEEP) ---
const KEEPALIVE_URL = process.env.RENDER_EXTERNAL_URL 
    ? `${process.env.RENDER_EXTERNAL_URL}/health` 
    : `http://localhost:${PORT}/health`;

// Ping every 10 minutes (600000 ms)
setInterval(() => {
    console.log(`[Keep-Alive] Pinging ${KEEPALIVE_URL}...`);
    const protocol = KEEPALIVE_URL.startsWith('https') ? https : require('http');
    
    protocol.get(KEEPALIVE_URL, (res) => {
        console.log(`[Keep-Alive] Status: ${res.statusCode}`);
    }).on('error', (err) => {
        console.error(`[Keep-Alive] Error: ${err.message}`);
    });
}, 600000); 

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
