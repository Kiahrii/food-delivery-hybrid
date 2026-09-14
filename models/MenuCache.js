const mongoose = require("mongoose");
const menuItemSchema = new mongoose.Schema(
    {
    id: Number,
    name: String,
    description: String,
    price: Number
    },
    {
    _id: false
    }
);

const menuCacheSchema = new mongoose.Schema(
    {
        restaurantId: {
        type: Number,
        required: true,
        unique: true
        },

        restaurantName: {
        type: String,
        required: true
        },

        items: {
        type: [menuItemSchema],
        default: []
        }
    },
    {
    timestamps: true
    }
);

module.exports = mongoose.model(
    "MenuCache",
    menuCacheSchema,
    "menu_cache"
);