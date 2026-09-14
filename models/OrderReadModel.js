const mongoose = require("mongoose");
const orderItemSchema = new mongoose.Schema(
    {
        name: String,
        quantity: Number,
        price: Number
    },
    {
        _id: false
    }
);

const orderReadModelSchema = new mongoose.Schema(
    {
        orderId: {
            type: Number,
            required: true,
            unique: true
        },
            customerName: String,
            restaurant: String,
            totalAmount: Number,
            status: String,
        items: {
        type: [orderItemSchema],
        default: []
        }
    },
    {
    timestamps: true
    }
);

module.exports = mongoose.model(
"OrderReadModel",
orderReadModelSchema,
"order_read_models"
);