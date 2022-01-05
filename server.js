require("dotenv").config()
const mongoose = require('mongoose');
var ObjectID = require('mongodb').ObjectID; 
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
var db = mongoose.connection;
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
app.post('/order', validateToken, async (req, res) => {
    const { sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address, item_desc, item_weight } = req.body;
    const order_status = "Order picked up";
    const d = new Date();
    const updated_at = d.toISOString();
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
            order_status,
            updated_at
        });
        res.json({ "Orders created successfully, Order id:" : response._id });
    }
    catch (error) {
        if (error.code === 11000) {
            // duplicate key
            return res.json({ status: 'error', error: 'Duplicate Order' });
        }
        throw error;
    }
  
});
app.get('/order/:order_id', async (req, res) => {
    const { order_id } = req.params;
    console.log(JSON.stringify(order_id));
    db.collection('orders').find({ "_id": new ObjectID(order_id)}).toArray((err, result) => {
        if (!err) {
            res.send(result);
        } else {
            console.log(err);
        }

    });
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