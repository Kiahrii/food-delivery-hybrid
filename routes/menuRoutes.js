const express = require("express");
const { getMenu} = require("../controllers/menuController");

const router = express.Router();
    // GET /api/menu/:restaurantId

router.get(
    "/:restaurantId",
    getMenu
);

module.exports = router;