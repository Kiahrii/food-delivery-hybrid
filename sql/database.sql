CREATE DATABASE IF NOT EXISTS food_delivery;
USE food_delivery;
-- ============================================
-- RESTAURANTS
-- ============================================
CREATE TABLE IF NOT EXISTS restaurants (
id INT PRIMARY KEY AUTO_INCREMENT,
name VARCHAR(100) NOT NULL,
address VARCHAR(255)
);
-- ============================================
-- MENU ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS menu_items (
id INT PRIMARY KEY AUTO_INCREMENT,
restaurant_id INT NOT NULL,
name VARCHAR(100) NOT NULL,
description TEXT,
price DECIMAL(10,2) NOT NULL,
available BOOLEAN DEFAULT TRUE,
FOREIGN KEY (restaurant_id)
REFERENCES restaurants(id)
);
-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
id INT PRIMARY KEY AUTO_INCREMENT,
customer_name VARCHAR(100) NOT NULL,
restaurant_id INT NOT NULL,
total_amount DECIMAL(10,2) NOT NULL,
status VARCHAR(50) DEFAULT 'Pending',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (restaurant_id)
REFERENCES restaurants(id)
);
-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
id INT PRIMARY KEY AUTO_INCREMENT,
order_id INT NOT NULL,
menu_item_id INT NOT NULL,
quantity INT NOT NULL,
price DECIMAL(10,2) NOT NULL,
FOREIGN KEY (order_id)
REFERENCES orders(id),
FOREIGN KEY (menu_item_id)
REFERENCES menu_items(id)
);
-- ============================================
-- SAMPLE RESTAURANTS
-- ============================================
INSERT INTO restaurants (name, address)
VALUES
('Campus Cafe', 'Main Campus'),
('Quick Bites', 'Downtown');
-- ============================================
-- SAMPLE MENU
-- ============================================
INSERT INTO menu_items
(restaurant_id, name, description, price, available)
VALUES
(1, 'Chicken Rice', 'Fried chicken with rice', 120.00, TRUE),
(1, 'Burger', 'Beef burger with fries', 150.00, TRUE),
(1, 'Iced Coffee', 'Cold brewed coffee', 80.00, TRUE),
(2, 'Pizza', 'Cheese and pepperoni pizza', 250.00, TRUE);