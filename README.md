# 🛒 E-Commerce Platform

> Full-Stack Online Shopping Application  
> **React • Node.js • Express • PostgreSQL**

---

## 📌 Overview

A full-stack e-commerce web application that allows users to:
- Sign up and log in securely
- Browse products
- Add/remove items from cart
- Place orders with delivery address
- View order confirmation

Built using REST APIs with session-based authentication.

---

## 🛠️ Tech Stack

- **Frontend:** React, React Router
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Authentication:** express-session, bcrypt
- **API:** REST (JSON)

---

## 🗄️ Database Schema

| Table | Description |
|-------|-------------|
| `Users` | user_id, username, email, password_hash |
| `Products` | product_id, name, price, stock_quantity |
| `Cart` | user_id, item_id, quantity |
| `Orders` | order_id, user_id, order_date, total_amount |
| `OrderItems` | order_id, product_id, quantity, price |
| `OrderAddress` | order_id, street, city, state, pincode |

---
## ✨ Features

### 🔐 User Authentication
- Sign up with username, email, password
- Secure login/logout
- Passwords are encrypted (never stored as plain text)

### 🛍️ Product Browsing
- View all available products
- Search products by name
- See price and stock availability

### 🛒 Shopping Cart
- Add products to cart
- Increase/decrease quantity
- Remove items
- View total price

### 📦 Checkout & Orders
- Enter delivery address
- **Auto-fill city & state from pincode** (via postal API)
- Place order
- View order confirmation with all details

---

## 🔌 REST API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Register new user |
| POST | `/login` | User authentication |
| POST | `/logout` | Destroy session |
| GET | `/isLoggedIn` | Check auth status |

### Products & Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/list-products` | Fetch all products |
| POST | `/add-to-cart` | Add item to cart |
| GET | `/display-cart` | Get cart contents |
| POST | `/update-cart` | Update item quantity |
| POST | `/remove-from-cart` | Remove item |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/place-order` | Checkout cart |
| GET | `/order-confirmation` | Get latest order |

---

## 📦 Dependencies

### Backend
- **express** — Web server framework
- **pg** — PostgreSQL database connector
- **bcrypt** — Password encryption
- **express-session** — User session management
- **body-parser** — Parse incoming request data
- **cors** — Enable cross-origin requests

### Frontend
- **react** — UI framework
- **react-router** — Page navigation

---



---

<p align="center">🛒 <b>Simple. Secure. Shopping.</b> 🛒</p>
