const { pool } = require("../config/mysql");
const OrderReadModel = require("../models/OrderReadModel");

// ======================================================
// PLACE ORDER
// POST /api/orders
// ======================================================

async function createOrder(req, res) {
    const connection = await pool.getConnection();
    try {
        const {
            customerName,
            restaurantId,
            items
        } = req.body;

        // ------------------------------------------
        // VALIDATE REQUEST
        // ------------------------------------------

        if (!customerName) {
            return res.status(400).json({
                message: "Customer name is required."
            });
        }

        if (!restaurantId) {
            return res.status(400).json({
                message: "Restaurant ID is required."
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "At least one order item is required."
            });
        }

        // ------------------------------------------
        // START SQL TRANSACTION
        // ------------------------------------------

        await connection.beginTransaction();

        // ------------------------------------------
        // CHECK RESTAURANT
        // ------------------------------------------

        const [restaurants] = await connection.execute(
            `
            SELECT *
            FROM restaurants
            WHERE id = ?
            `,
            [restaurantId]
        );

        if (restaurants.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                message: "Restaurant not found."
            });
        }

        // ------------------------------------------
        // VALIDATE MENU ITEMS
        // ------------------------------------------

        let totalAmount = 0;
        const validatedItems = [];

        for (const item of items) {
            if (!item.menuItemId || !item.quantity) {
                await connection.rollback();
                return res.status(400).json({
                    message: "Each item must have a menuItemId and quantity."
                });
            }

            if (item.quantity <= 0) {
                await connection.rollback();
                return res.status(400).json({
                    message: "Quantity must be greater than zero."
                });
            }

            const [menuItems] = await connection.execute(
                `
                SELECT *
                FROM menu_items
                WHERE id = ?
                AND restaurant_id = ?
                AND available = TRUE
                `,
                [item.menuItemId, restaurantId]
            );

            if (menuItems.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    message: `Menu item ${item.menuItemId} is unavailable or does not belong to this restaurant.`
                });
            }

            const menuItem = menuItems[0];
            const itemTotal = Number(menuItem.price) * Number(item.quantity);

            totalAmount += itemTotal;

            validatedItems.push({
                menuItemId: menuItem.id,
                name: menuItem.name,
                quantity: Number(item.quantity),
                price: Number(menuItem.price)
            });
        }

        // ------------------------------------------
        // INSERT ORDER
        // ------------------------------------------

        const [orderResult] = await connection.execute(
            `
            INSERT INTO orders (customer_name, restaurant_id, total_amount, status) 
            VALUES (?, ?, ?, ?)`, 
            [customerName, restaurantId, totalAmount, 'Pending']
        );

        const orderId = orderResult.insertId;

        // ------------------------------------------
        // INSERT ORDER ITEMS
        // ------------------------------------------

        for (const item of validatedItems) {
            await connection.execute(
                `
                INSERT INTO order_items (order_id, menu_item_id, quantity, price) 
                VALUES (?, ?, ?, ?)`, 
                [orderId, item.menuItemId, item.quantity, item.price]
            );
        }

        // ------------------------------------------
        // COMMIT SQL TRANSACTION
        // ------------------------------------------

        await connection.commit();

        // ------------------------------------------
        // CREATE MONGODB READ MODEL
        // ------------------------------------------

        try{
            const restaurant = restaurants[0];
            const readModel = await OrderReadModel.create({
                orderId: orderId,
                customerName: customerName,
                restaurant: restaurant.name,
                totalAmount: totalAmount,
                status: 'Pending',
                items: validatedItems.map(item => ({
                    name:item.name,
                    quantity:item.quantity,
                    price:item.price
                }))
            });

            console.log(`MongoDB read model created for order ${orderId}`);

        } catch (error) {
            console.error("MongoDB synchronization failed.");
            console.error(error.message);
            console.log("SQL remains the source of truth");
        }

        // ------------------------------------------
        // RESPONSE
        // ------------------------------------------

        res.status(201).json({
            message: "Order placed successfully.",
            orderId: orderId,
            totalAmount: totalAmount,
            status: 'Pending'
        });

    } catch (error) {

        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError.message);
        }

        console.error(error);

        res.status(500).json({
            message: "Failed to place order.",
            error: error.message
        })

    } finally {
        connection.release();
    }
}

// ======================================================
// TRACK ORDER
// GET /api/orders/:id
// ======================================================

async function getOrder(req, res) {
    try {
        const orderId = Number(req.params.id);
        if (!orderId) {
            return res.status(400).json({
                message: "Invalid order ID."
            });
        }

        // ------------------------------------------
        // FIRST READ FROM MONGODB
        // ------------------------------------------

        const readModel = await OrderReadModel.findOne({ orderId: orderId });
        if (readModel) {
            return res.status(200).json({
                orderId: readModel.orderId,
                customerName: readModel.customerName,
                restaurant: readModel.restaurant,
                totalAmount: readModel.totalAmount,
                status: readModel.status,
                items: readModel.items
            });
        }

        // ------------------------------------------
        // FALLBACK TO SQL
        // ------------------------------------------

        const [orders] = await pool.execute(
            `
            SELECT
                o.id,
                o.customer_name,
                o.restaurant_id,
                o.total_amount,
                o.status,
                r.name AS restaurant_name
            FROM orders o
            INNER JOIN restaurants r ON o.restaurant_id = r.id
            WHERE o.id = ?
            `,
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        const order = orders[0];

        const [items] = await pool.execute(
            `
            SELECT
                m.name,
                oi.quantity,
                oi.price
            FROM order_items oi
            INNER JOIN menu_items m ON oi.menu_item_id = m.id
            WHERE oi.order_id = ?
            `, 
            [orderId]
        );

        res.status(200).json({
            orderId: order.id,
            customerName: order.customer_name,
            restaurant: order.restaurant_name,
            totalAmount: Number(order.total_amount),
            status: order.status,
            items: items
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to retrieve order.",
            error: error.message
        });
    }
}

// ======================================================
// UPDATE ORDER STATUS
// PUT /api/orders/:id/status
// ======================================================

async function updateOrderStatus(req, res) {
            try {
                const orderId = Number(req.params.id);
                const { status } = req.body;
                const allowedStatuses = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
                if (!allowedStatuses.includes(status)) {
                    return res.status(400).json({
                        message: "Invalid order status.",
                        allowedStatuses: allowedStatuses
                    });
                }

                // ------------------------------------------
                // UPDATE SQL FIRST
                // ------------------------------------------

                const [result] = await pool.execute(
                    `
                    UPDATE orders
                    SET status = ?
                    WHERE id = ?
                    `, [status,orderId]
                );

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        message: "Order not found."
                    });
                }

                // ------------------------------------------
                // UPDATE MONGODB
                // ------------------------------------------

                try {
                    const updatedReadModel = await OrderReadModel.findOneAndUpdate(
                        {orderId: orderId},
                        {status: status},
                        {new: true}
                    );

                    if (!updatedReadModel) {
                        console.log("MongoDB read model not found");
                    }

                } catch (mongoError) {
                    console.error("MongoDB synchronization failed.");
                    console.error(mongoError.message);
                    console.log("SQL remains the source of truth");
                    return res.status(200).json({
                        message: "Order status updated in SQL, but MongoDB synchronization failed.",
                        orderId: orderId,
                        status: status,
                        consistency: "eventual"
                    });

                    res.status(200).json({
                        message: "Order status updated successfully.",
                        orderId: orderId,
                        status: status
                    });
                }

            } catch (error) {
                console.error(error);
                res.status(500).json({
                    message: "Failed to update order status.",
                    error: error.message
                });
            }
        }

// ======================================================
// EVENTUAL CONSISTENCY SIMULATION
// PUT /api/orders/:id/status/delayed
// ======================================================

async function updateOrderStatusDelayed(req, res) {
    try{
        const orderId = Number(req.params.id);
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({
                message: "Status is required."
            });
        }

        // ------------------------------------------
        // UPDATE SQL IMMEDIATELY
        // ------------------------------------------

        const [result] = await pool.execute(
            `
            UPDATE orders
            SET status = ?
            WHERE id = ?
            `, [status, orderId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        console.log(`SQL updated immediately: ${status}`);

        // ------------------------------------------
        // RETURN RESPONSE BEFORE MONGODB UPDATE
        // ------------------------------------------

        res.status(200).json({
            message: "SQL updated immediately. MongoDB synchronization delayed for 5 seconds",
            orderId: orderId,
            sqlStatus: status,
            nosqlStatus: "Temporary old value"
        });

        // ------------------------------------------
        // DELAY MONGODB UPDATE
        // ------------------------------------------

        setTimeout(async () => {
            try {
                await OrderReadModel.findOneAndUpdate(
                    { orderId: orderId },
                    { status: status },
                );
                console.log(`MongoDB synchronized after 5 seconds: ${status}`);

            }catch (mongoError) {
                console.error("MongoDB synchronization failed.", mongoError.message);         
            }
        },5000);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to simulate eventual consistency.",
            error: error.message
        });

    }
}

module.exports = {
    createOrder,
    getOrder,
    updateOrderStatus,
    updateOrderStatusDelayed
};  