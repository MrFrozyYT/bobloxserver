const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const mongoURI = "mongodb+srv://admin:boblox123@bobloxserver.nc5xodv.mongodb.net/?appName=bobloxserver";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.log("❌ DB Error:", err));

// --- SCHEMAS ---
const Announcement = mongoose.model('Announcement', new mongoose.Schema({ 
    text: String, 
    active: Boolean 
}));

const User = mongoose.model('User', new mongoose.Schema({ 
    username: String, 
    password: String, 
    isAdmin: Boolean,
    headColor: { type: String, default: "#FFC800" },
    torsoColor: { type: String, default: "#0000FF" },
    leftArmColor: { type: String, default: "#FFC800" },
    rightArmColor: { type: String, default: "#FFC800" },
    leftLegColor: { type: String, default: "#00AA00" },
    rightLegColor: { type: String, default: "#00AA00" },
    joinedDate: { type: Date, default: Date.now }
}));

const Game = mongoose.model('Game', new mongoose.Schema({ 
    name: String, 
    creator: String, 
    data: String,
    plays: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
}));

const Group = mongoose.model('Group', new mongoose.Schema({
    name: String,
    description: String,
    owner: String,
    members: [String],
    createdDate: { type: Date, default: Date.now }
}));

// --- ROUTES ---

app.get('/', (req, res) => { 
    res.json({ message: "Boblox API Online", status: "Active" }); 
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// 1. ANNOUNCEMENTS
app.get('/api/announcement', async (req, res) => { 
    try {
        const ann = await Announcement.findOne({ active: true }); 
        res.json(ann || { text: "" }); 
    } catch(e) { res.json({ text: "" }); }
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

// 2. AUTHENTICATION
app.post('/api/register', async (req, res) => { 
    try { 
        const { username, password } = req.body; 
        const exists = await User.findOne({ username }); 
        if(exists) return res.json({ success: false, message: "User exists" }); 
        
        const newUser = new User({ 
            username, 
            password, 
            isAdmin: (username === "MrFrozy") 
        }); 
        await newUser.save(); 
        res.json({ success: true }); 
    } catch(e) { 
        res.json({ success: false, error: e.message }); 
    } 
});

app.post('/api/login', async (req, res) => { 
    const { username, password } = req.body; 
    const user = await User.findOne({ username, password }); 
    if(user) res.json({ 
        success: true, 
        user: { 
            username: user.username, 
            isAdmin: user.isAdmin,
            headColor: user.headColor,
            torsoColor: user.torsoColor,
            leftArmColor: user.leftArmColor,
            rightArmColor: user.rightArmColor,
            leftLegColor: user.leftLegColor,
            rightLegColor: user.rightLegColor
        } 
    }); 
    else res.json({ success: false, message: "Invalid credentials" }); 
});

// 3. USER PROFILE
app.get('/api/user/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if(!user) return res.status(404).json({ error: "User not found" });
        
        res.json({
            username: user.username,
            headColor: user.headColor,
            torsoColor: user.torsoColor,
            leftArmColor: user.leftArmColor,
            rightArmColor: user.rightArmColor,
            leftLegColor: user.leftLegColor,
            rightLegColor: user.rightLegColor,
            joinedDate: user.joinedDate
        });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/user/avatar', async (req, res) => {
    try {
        const { username, headColor, torsoColor, leftArmColor, rightArmColor, leftLegColor, rightLegColor } = req.body;
        
        await User.findOneAndUpdate(
            { username },
            { headColor, torsoColor, leftArmColor, rightArmColor, leftLegColor, rightLegColor }
        );
        
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 4. GAMES
app.post('/api/publish', async (req, res) => {
    console.log("📥 Publish Request Received");
    const { name, creator, data } = req.body;
    
    if (!name || !creator || !data) {
        return res.status(400).json({ success: false, message: "Missing data" });
    }

    try {
        await Game.findOneAndUpdate(
            { name: name, creator: creator },
            { 
                data: data, 
                lastUpdated: Date.now() 
            },
            { upsert: true, new: true }
        );

        console.log(`✨ Game Published/Updated: ${name} by ${creator}`);
        res.json({ success: true, message: "Published successfully" });
    } catch (e) { 
        console.error("Publish Error:", e); 
        res.status(500).json({ success: false, error: e.message }); 
    }
});

app.get('/api/games', async (req, res) => {
    try {
        const games = await Game.find(); 
        res.json(games);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE GAME (ADMIN ONLY)
app.delete('/api/game/:id', async (req, res) => {
    try {
        await Game.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 5. GROUPS
app.post('/api/group/create', async (req, res) => {
    try {
        const { name, description, owner } = req.body;
        
        const exists = await Group.findOne({ name });
        if(exists) return res.json({ success: false, message: "Group name taken" });
        
        const newGroup = new Group({
            name,
            description,
            owner,
            members: [owner]
        });
        
        await newGroup.save();
        res.json({ success: true, group: newGroup });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/groups', async (req, res) => {
    try {
        const groups = await Group.find();
        res.json(groups);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/group/:name', async (req, res) => {
    try {
        const group = await Group.findOne({ name: req.params.name });
        if(!group) return res.status(404).json({ error: "Group not found" });
        res.json(group);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/group/join', async (req, res) => {
    try {
        const { groupName, username } = req.body;
        
        const group = await Group.findOne({ name: groupName });
        if(!group) return res.json({ success: false, message: "Group not found" });
        
        if(group.members.includes(username)) {
            return res.json({ success: false, message: "Already a member" });
        }
        
        group.members.push(username);
        await group.save();
        
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/group/leave', async (req, res) => {
    try {
        const { groupName, username } = req.body;
        
        const group = await Group.findOne({ name: groupName });
        if(!group) return res.json({ success: false, message: "Group not found" });
        
        group.members = group.members.filter(m => m !== username);
        await group.save();
        
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 6. STATS
app.get('/api/players', async (req, res) => { 
    const count = await User.countDocuments(); 
    res.json({ count: count + 100 }); 
});

app.get('/api/game/stats', async (req, res) => { 
    const game = await Game.findOne().sort({ lastUpdated: -1 }); 
    if(game) { 
        res.json({ likes: game.likes, favorites: game.favorites, visits: game.plays }); 
    } else { 
        res.json({ likes: 0, favorites: 0, visits: 0 }); 
    } 
});

// --- KEEP ALIVE ---
const SERVER_URL = "https://bobloxserver.onrender.com/health"; 

setInterval(() => {
    console.log("⏰ Sending Keep-Alive Ping...");
    https.get(SERVER_URL, (res) => {
        console.log(`✅ Keep-Alive Ping Status: ${res.statusCode}`);
    }).on('error', (e) => {
        console.error(`❌ Keep-Alive Ping Error: ${e.message}`);
    });
}, 600000);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
