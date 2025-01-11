const { Database } = require('st.db');
const login = new Database('./database/login.json');
const notification = new Database('./database/notifications.json');
const area = new Database('./database/area.json');
const config = new Database('./database/config.json');

login.clear();
notification.clear();
area.clear();
config.clear();