# E-Commerce Platform

Full-stack online shopping application.
**Node.js · Express · EJS · PostgreSQL**

---

## Overview

A server-rendered e-commerce web application that allows users to:

- Sign up and log in securely
- Browse, search, filter and sort products
- Add and remove items from a cart
- Enter a delivery address and place an order
- View order confirmation with the stored address

Pages are rendered on the server with EJS templates. Authentication is
session-based, and passwords are hashed with bcrypt.

---

## Requirements

- Node.js 18 or newer
- PostgreSQL 12 or newer, running locally

---

## Setup

**1. Install dependencies**

```bash
npm install
```

**2. Configure the database connection**

Copy `.env.example` to `.env` and fill in your PostgreSQL password:

```
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password_here
PGDATABASE=amazon_clone
PGSSL=false

PORT=3000
SESSION_SECRET=any_long_random_string
```

`.env` is gitignored and must never be committed.

**3. Create and seed the database**

```bash
npm run setup
```

This creates the database if it does not exist, then runs `DDL.sql`
followed by `data.sql`. It is safe to re-run, since `DDL.sql` drops and
recreates the tables. Seeds 20 products.

**4. Start the server**

```bash
npm start
```

Open <http://localhost:3000>.

### Available scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the server on `PORT` (default 3000) |
| `npm run setup` | Create the database and load schema and seed data |
| `npm run preview` | Render all views to static HTML in `preview/` without a database |

---

## Database Schema

| Table | Columns |
|-------|---------|
| `Users` | user_id, username, email, password_hash |
| `Products` | product_id, name, price, stock_quantity |
| `Cart` | user_id, item_id, quantity |
| `Orders` | order_id, user_id, order_date, total_amount, ship_name, ship_line1, ship_line2, ship_city, ship_postcode, ship_phone, ship_method, shipping_cost |
| `OrderItems` | order_id, product_id, quantity, price |

The delivery address is stored on `Orders` rather than in a separate
lookup table, so it is snapshotted at the time of purchase. Editing a
saved address later can never rewrite where a past order was shipped.

---

## Features

### User authentication
- Sign up with name, email and password
- Session-based login and logout
- Passwords hashed with bcrypt, never stored as plain text
- Protected routes redirect anonymous visitors to the login page

### Product browsing
- Full catalogue with category filtering and sorting by price, rating or name
- Keyword search across product name, category and collection
- Individual product pages with related product suggestions
- Live price and stock availability from the database

### Shopping cart
- Add items from a product page or with a quick-add control
- Quantity is merged when an item is added twice
- Remove items from the cart page or by reference number
- Stock is validated before an item is added

### Checkout and orders
- Delivery address form with server-side validation
- Standard or express delivery, with free standard delivery over $150
- Address is validated before any stock or order record is written
- Stock is decremented and the cart cleared once an order is placed
- Order confirmation shows the items, delivery address and cost breakdown

Payment capture is not implemented. No card details are collected.

---

## Routes

### Public

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Home page |
| GET | `/shop` | Product listing with `?category=`, `?q=`, `?sort=` |
| GET | `/collections` | Collections index |
| GET | `/collections/:slug` | Single collection |
| GET | `/new-arrivals` | Recently added products |
| GET | `/product/:id` | Product detail |
| GET | `/about` | About page |
| GET | `/wishlist` | Wishlist (stored client-side) |

### Authentication

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/signup` | Registration form |
| POST | `/signup` | Create an account |
| GET | `/login` | Login form |
| POST | `/login` | Authenticate |
| GET | `/logout` | Destroy the session |

### Protected (login required)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/dashboard` | Account overview |
| GET | `/list-products` | Full product catalogue |
| GET | `/add-to-cart` | Add by reference number |
| POST | `/add-to-cart` | Add an item to the cart |
| GET | `/remove-from-cart` | Remove by reference number |
| POST | `/remove-from-cart` | Remove an item from the cart |
| GET | `/display-cart` | Cart contents and totals |
| GET | `/checkout` | Delivery address form |
| POST | `/place-order` | Validate the address and place the order |
| GET | `/order-confirmation` | Most recent order |

---

## Project structure

```
app.js              Express server, routes and database queries
setup-db.js         Creates the database and loads DDL.sql + data.sql
preview.js          Renders views to static HTML without a database
DDL.sql             Table definitions
data.sql            Seed product data
lib/
  catalog.js        Presentation layer: category, collection, copy,
                    rating and inline SVG artwork derived from product rows
views/              EJS templates
  partials/         Shared head, header, footer and product card
public/
  css/style.css     Design system
  js/app.js         Front-end interactions
```

### About `lib/catalog.js`

The `Products` table stores only `product_id`, `name`, `price` and
`stock_quantity`. Everything else the storefront displays (category,
collection, description, rating and product imagery) is derived
deterministically from the product row in `lib/catalog.js`.

Prices, names and stock are always read live from PostgreSQL. Ratings
and reviews are sample content and are not persisted. To move any of
these into the database, add the column and read it in place of the
lookup; the templates do not need to change.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `express` | Web server framework |
| `ejs` | Server-side templating |
| `pg` | PostgreSQL client |
| `bcrypt` | Password hashing |
| `express-session` | Session management |
| `body-parser` | Request body parsing |
| `dotenv` | Loads configuration from `.env` |
