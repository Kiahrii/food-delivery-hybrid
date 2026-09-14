const express = require("express");
require("dotenv").config();
const connectMongoDB = require("./config/mongodb");
const {pool, testMySQLConnection} = require("./config/mysql");
const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");
const app = express();

//Middleware
app.use(express.json());

// HOME ROUTE
app.get("/", (req, res) => {
res.json({ 
    message: "Hybrid Food Delivery API",
    architecture: "MySQL + MongoDB",
        endpoints: {
            menu: "GET /api/menu/:restaurantId",
            createOrder: "POST /api/orders",
            trackOrder: "GET /api/orders/:id",
            updateStatus: "PUT /api/orders/:id/status",
            eventualConsistency: "PUT /api/orders/:id/status/delayed"
        }
    });
});

// API ROUTES
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);

//404 HANDLER
app.use((req, res) => {
    res.status(404).json({message: "Endpoint not found."});
});

//ERROR HANDLER
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        message:"Internal server error.", error: err.message
    });
});

//START SERVER
const PORT = process.env.PORT || 3000;

async function startServer() {
    await testMySQLConnection();
    await connectMongoDB();

app.listen(
    PORT,
    () => {
        console.log(`Server running at http://localhost:${PORT}`);
    }
);}
startServer();