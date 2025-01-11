const express = require('express');
const cors = require('cors');
const app = express();
const { Database } = require('st.db');
const config = new Database('./database/config.json');
const login = new Database('./database/login.json');
const port = 3000;
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const area = new Database('./database/area.json');
const notifications = new Database('./database/notifications.json');
const id = new Database('./database/id.json');
const aidata = new Database('./database/aidata.json');
const os = require('os');

app.use(cors()); // Enable CORS
app.use(express.json());
config.set('version', '0.4');

app.get('/', (req, res) => {
    config.fetch('op');
    if (config.has('op')) {
        ShowLogin(res);
    } else {
        ShowSetup(res);
    }
});

app.use(express.static('public'));

function ShowSetup(res) {
    res.redirect('index.html?show=setup');
}

function ShowLogin(res) {
    res.redirect('index.html?show=login');
}

function ShowDashboard(res) {
    res.redirect('index.html?show=dashboard');
}

app.post("/api/setupOp", (req, res) => {
    const { username, password } = req.body;
    console.log(`Received data - Username: ${username}, Password: ${password}`);

    let result = '';

    function generateRandomId() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        
        for (let i = 0; i < 18; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
    }

    generateRandomId();
    idset(username, result);
    
    config.set('op', username);
    login.set(username, password);
    res.json({ message: 'setup_complete' });
});

function idset(username, result) {
    id.set('id', result);
};

app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    console.log(`Received data - Username: ${username}, Password: ${password}`);
  
    let passwd = login.fetch(username);
    if (passwd === password) {
        res.json({ message: 'login_yes' });
    } else {
        res.json({ message: 'login_no' });
    }
});

const uploadPath = path.join(__dirname, 'images', 'area');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// Set up multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        let areanum = config.get('areanum');
        if (!areanum) {
            areanum = 1;
            config.set('areanum', areanum);
        } else {
            areanum += 1;
            config.set('areanum', areanum);
        }
        console.log('Updated areanum:', areanum);
        cb(null, `area_${areanum}_ungrid${ext}`);
        gridImage();
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        // Accept only image files
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and JPG are allowed.'));
        }
    },
});

// Image upload endpoint
app.post('/uploadimagearea', upload.single('image'), (req, res) => {
    res.json({ message: 'Image uploaded successfully' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});


function getServerIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1'; // Fallback to localhost if no external IP is found
}

const serverIp = getServerIp();

function gridImage() {
    axios.post(`http://${serverIp}:5000/api/rungrid`)
        .then(response => {
            console.log(response.data);
        })
        .catch(error => {
            console.error('Error posting to /api/rungrid:', error);
        });
};

app.post("/api/checkareanum", (req, res) => {
    res.json({ message: config.get('areanum') });
});

app.post("/api/areasetup", (req, res) => {
    const { areaname, areanotes } = req.body;
    console.log(`Received data - Area name: ${areaname}, Area notes: ${areanotes}`);
  
    area.set(config.get('areanum'), { areaname, areanotes });

    res.json({ message: 'true' });
});

app.get('/api/loginusername', (req, res) => {
    const { username } = req.body;
    res.json({ username: config.get('op') });
});

app.get("/api/dashboardshow", (req, res) => {
    res.redirect('/dash/index.html');
});

// Endpoint to fetch notifications
app.get('/api/notifications', (req, res) => {
    const allNotifications = notifications.all();
    res.json(Object.values(allNotifications));
});

// Endpoint to mark a notification as read
app.post('/api/notifications/read', (req, res) => {
    const { id } = req.body;
    const notification = notifications.fetch(id);
    if (notification) {
        notification.read = true;
        notifications.set(id, notification);
        res.json({ message: 'Notification marked as read' });
    } else {
        res.json({ message: 'Notification not found' });
    }
});

// Add notification endpoint
app.post('/api/notification', (req, res) => {
    const { message, red } = req.body;
    const id = Date.now().toString(); // Generate unique ID based on timestamp
    notifications.set(id, { message, red });
    res.json({ message: 'Notification added', id });
});

app.post('/api/loadappid', (req, res) => {
    const appid = id.fetch('id');
    res.json({ id: appid });
});

app.post('/api/checkforupdates', (req, res) => {
    const version = config.get('version');
    res.json({ version });
});

app.get('/api/heatmap-data', (req, res) => {
    const data = aidata.get('heatmap');
    res.json({ data });
});

app.post('/api/areadata', (req, res) => {
    const areanum = config.get('areanum');
    const areas = [];

    for (let i = 1; i <= areanum; i++) {
        const areaData = area.get(i.toString());
        if (areaData) {
            areas.push({
                number: i,
                name: areaData.areaname,
                notes: areaData.areanotes
            });
        }
    }

    res.json(areas);
});

app.post('/api/checkareabutton', (req, res) => {
    const message = config.get('areanum');
    res.json({ number: message });
});

app.post('/api/notifications/remove', (req, res) => {
    console.log(1)
    const { id } = req.body;
    const notification = notifications.fetch(id);
    if(notification) {
        notifications.delete(id);
        res.json({ message: 'Notification removed' });
    } else {
        res.json({ message: 'Notification not found' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}\nDev by NSU Team`);
});