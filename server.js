require("dotenv").config()
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const User = require('./model/user');
const Orders = require('./model/orders');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3000;
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
});
const app = express();
app.use('/', express.static(path.join(__dirname, 'static')));
app.use(bodyParser.json());
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).lean();
    if (!user) {
        return res.json({ status: 'error', error: 'Invalid username/password' });
    }
    if (await bcrypt.compare(password, user.password)) {
        // the username, password combination is successful
        const token = jwt.sign({
            id: user._id,
            username: user.username
        }, JWT_SECRET, { expiresIn: "15m" });
        return res.json({ status: 'ok', data: token });
    }
    res.json({ status: 'error', error: 'Invalid username/password' });
});
app.post('/api/orders', validateToken, async (req, res) => {
    const { sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address, item_desc, item_weight } = req.body;
    const order_status = "Order picked up";
    try {
        const response = await Orders.create({
            sender_name,
            sender_phone,
            sender_address,
            receiver_name,
            receiver_phone,
            receiver_address,
            item_desc,
            item_weight,
            order_status
        });
        console.log('Orders created successfully, Tracking id: ', response._id);
    }
    catch (error) {
        if (error.code === 11000) {
            // duplicate key
            return res.json({ status: 'error', error: 'Duplicate Order' });
        }
        throw error;
    }
    res.json({ status: 'ok' });
});
function validateToken(req, res, next) {
  
    const authHeader = req.headers["authorization"];
    const token = authHeader.split(" ")[1];
  if (token == null)
        res.sendStatus(400).send("Token not present");
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            res.status(403).send("Token invalid");
        }
        else {
            req.user = user;
            next(); 
        }
    });
} 
app.listen(PORT, () => {
    console.log(`Server up at ${ PORT }`);
});