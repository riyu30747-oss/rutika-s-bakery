require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
// REPLACE THIS WITH YOUR REAL SECRET KEY (sk_test_...)
// GOOD: Safe for GitHub
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.static('public')); 
app.use(cors());
app.use(bodyParser.json());

// --- DATABASE (In-Memory) ---
let users = [
    { name: "Admin", phone: "0000", email: "admin@bakery.com", password: "admin", isAdmin: true },
// NEW ADMIN (Add this block)
    { 
        name: "riya sharma", 
        phone: "9876543210", 
        email: "riya30747@gmail.com", 
        password: "riya@admin", 
        isAdmin: true // <--- This makes them an Admin
    },
    { name: "User", phone: "1234", email: "user@test.com", password: "123", isAdmin: false }
];

let orders = []; // Stores real orders

// --- ROUTES ---

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (user) res.json({ success: true, user });
    else res.status(401).json({ success: false, message: "Invalid credentials" });
});

// Register
app.post('/api/register', (req, res) => {
    const { name, phone, email, password } = req.body;
    if (users.find(u => u.email === email)) return res.status(400).json({ success: false, message: "User exists" });
    const newUser = { name, phone, email, password, isAdmin: false };
    users.push(newUser);
    res.json({ success: true, user: newUser });
});

// --- ORDER ROUTES ---

// 1. Create Order
app.post('/api/orders', (req, res) => {
    const { email, items, total, address, method } = req.body;
    const newOrder = {
        id: Math.floor(1000 + Math.random() * 9000).toString(),
        date: new Date().toLocaleDateString(),
        email, items, total, address, method,
        status: 'Pending' // Default status
    };
    orders.push(newOrder);
    res.json({ success: true, orderId: newOrder.id });
});

// 2. Get Orders
app.get('/api/orders', (req, res) => {
    const { email, isAdmin } = req.query;
    if (isAdmin === 'true') {
        res.json(orders);
    } else {
        const userOrders = orders.filter(o => o.email === email);
        res.json(userOrders);
    }
});

// 3. NEW: Update Order Status (Accept/Decline)
app.put('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'Accepted' or 'Declined'

    // Find order
    const orderIndex = orders.findIndex(o => o.id === id);
    
    if (orderIndex !== -1) {
        orders[orderIndex].status = status;
        res.json({ success: true, order: orders[orderIndex] });
    } else {
        res.status(404).json({ success: false, message: "Order not found" });
    }
});

// Stripe Payment
const DOMAIN = 'http://localhost:3000';
app.post('/create-checkout-session', async (req, res) => {
    const { cartItems, customerAddress } = req.body;
    try {
        const lineItems = cartItems.map((item) => ({
            price_data: {
                currency: 'inr',
                product_data: { name: item.name },
                unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
        }));
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${DOMAIN}/success.html`,
            cancel_url: `${DOMAIN}/cart.html`,
        });
        res.json({ id: session.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));