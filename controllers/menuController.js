const MenuCache = require("../models/MenuCache");
// ============================================
// GET MENU FROM MONGODB
// GET /api/menu/:restaurantId
// ============================================
async function getMenu(req, res) {
    try {
        const restaurantId = Number(req.params.restaurantId);
        if (!restaurantId) {
        return res.status(400).json({
        message: "Invalid restaurant ID."
        });
        }
        const menu = await MenuCache.findOne({
        restaurantId: restaurantId
        });
        if (!menu) {
            return res.status(404).json({
            message: "Menu not found in NoSQL cache."
        });
        }
            res.status(200).json({
            restaurantId: menu.restaurantId,
            restaurantName: menu.restaurantName,
            items: menu.items
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
        message: "Failed to retrieve menu.",
        error: error.message
    });
    }}

module.exports = {
    getMenu
};