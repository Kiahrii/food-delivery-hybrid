const express = require("express");
const {
    createOrder,
    getOrder,
    updateOrderStatus,
    updateOrderStatusDelayed
    } = require("../controllers/orderController");

const router = express.Router();

// PLACE ORDER: POST /api/orders

router.post("/", createOrder);

// TRACK ORDER: GET /api/orders/:id

router.get("/:id", getOrder);

// UPDATE ORDER STATUS: PUT /api/orders/:id/status

router.put("/:id/status", updateOrderStatus);

// EVENTUAL CONSISTENCY DEMONSTRATION: PUT /api/orders/:id/status/delayed

router.put("/:id/status/delayed",updateOrderStatusDelayed);

module.exports = router;