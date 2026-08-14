DROP TABLE IF EXISTS Users CASCADE;
DROP TABLE IF EXISTS Products CASCADE;
DROP TABLE IF EXISTS Orders CASCADE;
DROP TABLE IF EXISTS OrderItems CASCADE;
DROP TABLE IF EXISTS Cart CASCADE;

CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

CREATE TABLE Products (
    product_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL
);

CREATE TABLE Orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10,2) NOT NULL,
    -- Delivery address, snapshotted at purchase time. Deliberately stored on
    -- the order rather than looked up from the user, so editing a saved
    -- address later never rewrites where a past order was actually shipped.
    ship_name VARCHAR(120) NOT NULL,
    ship_line1 VARCHAR(200) NOT NULL,
    ship_line2 VARCHAR(200),
    ship_city VARCHAR(120) NOT NULL,
    ship_postcode VARCHAR(24) NOT NULL,
    ship_phone VARCHAR(40),
    ship_method VARCHAR(20) NOT NULL DEFAULT 'standard',
    shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE OrderItems (
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE
);

CREATE TABLE Cart (
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES Products(product_id) ON DELETE CASCADE
);
