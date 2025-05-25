// ROLL NUMBER : 22B1074
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const app = express();
const port = 3000;


// TODO: Update PostgreSQL connection credentials before running the server
const pool = new Pool({
  user: 'preethi',
  host: 'dpg-d0pfl7emcj7s73e37bv0-a',
  database: 'amazon_1pnh',
  password: 'DUHIwTbNSC3LfZXF5xiJOjQIiaY5fIx5',
  port: 5432,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Set up session
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
}));


// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});



// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.session.userId) {
    return res.redirect('/dashboard');  // Redirect to dashboard or home page
  }
  next();  // If not logged in, proceed to the signup/login page
}

// TODO: Implement authentication middleware
// Redirect unauthenticated users to the login page
function isAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');  // not authenticated so redirect to login
  }
  next();  // authenticated so proceed
}


// Route: Home page
app.get('/', async (req, res) => {
  try {
    // Query to get all products
    const result = await pool.query('SELECT * FROM Products');
    
    // Render the 'home-page' template, 
    // passing the retrieved product data to the template 
    // for rendering within the page.
    res.render('home-page', { products: result.rows });
  } catch (error) {
    console.error(error);
    res.send('Server error');
  }
});


// Route: Signup page
app.get('/signup', isLoggedIn, (req, res) => {
  res.render('signup');
});

// TODO: Implement user signup logic
app.post('/signup', isLoggedIn, async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPwd = await bcrypt.hash(password, 10); // hash password
    const result = await pool.query(
      'INSERT INTO Users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id',
      [username, email, hashedPwd]
    );
    const userId = result.rows[0].user_id; // get user_id from result
    req.session.userId = userId; // store user_id in session
    res.redirect('/dashboard'); //redirect to dashboard
  } catch (error) {
    console.error(error);
    res.send('Error during signup. Please try again later.'); // error msg to display

  }

});


// Route: Login page 
app.get('/login', isLoggedIn, (req, res) => {
  res.render('login');
});

// TODO: Implement user login logic
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.send( 'Invalid email or password');
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.send('Invalid email or password');
    }
    req.session.userId =  user.user_id;
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.send('An error occured during login. Please try again later');
  }
});


// Route: Dashboard page (requires authentication)
// TODO: Render the dashboard page
app.get('/dashboard', isAuthenticated, async (req, res) => {
  res.render('dashboard');
});


// Route: List products
// TODO: Fetch and display all products from the database
app.get('/list-products', isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Products ORDER BY product_id');
    const products = result.rows;
    res.render('products', { products });
  } catch (error) {
    console.error(error);
    res.send(' Error retrieving products');
  }
});


// Route: Add product to cart
// TODO: Implement "Add to Cart" functionality
app.get('/add-to-cart', isAuthenticated, async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login')
  }
  res.render('add-to-cart', {session: req.session});
});

app.post('/add-to-cart', isAuthenticated, async (req, res) => {
  const { product_id, quantity } = req.body;
  // check user authentication
  if (!req.session.userId) {
    return res.redirect('/login')
  }
  if (!product_id || !quantity || isNaN(product_id) || isNaN(quantity) ||quantity <=0 ){
    return res.send('Invalid product ID or quantity');
  }
  const userId = req.session.userId;
  try {
    const productResult = await pool.query('SELECT * FROM Products WHERE product_id = $1', [product_id]);
    const product = productResult.rows[0];

    if (!product) { return res.send('Product not found');}
    // if (product.stock_quantity < quantity) {return res.send('Insufficient stock');}
    //check if  product already in users cart
    const cartResult = await pool.query('SELECT * FROM Cart WHERE user_id = $1 AND item_id = $2',[userId, product_id]);
    const existingCartItem = cartResult.rows[0];
    
    let finalQuantity = quantity;

    if (existingCartItem){
      // update quantity if product is inc art
      finalQuantity = existingCartItem.quantity + parseInt(quantity, 10);
    }
    if (product.stock_quantity < finalQuantity) {return res.send('Insufficient stock');}
    if (existingCartItem){
      await pool.query('UPDATE Cart SET quantity = $1 WHERE user_id = $2 AND item_id = $3', [finalQuantity, userId, product_id]);
      return res.send('Product quantity updated in your cart');
    }
    else {
      await pool.query('INSERT INTO Cart (user_id, item_id, quantity) VALUES ($1, $2, $3)', [userId, product_id, finalQuantity]);
      return res.send('Product added to your cart');
    }
  }  catch (error) {
    console.error(error);
    res.send('Error adding product to cart. Please try again later');
  }
});


// Route: Remove product from cart
// TODO: Implement "Remove from Cart" functionality
app.get('/remove-from-cart', isAuthenticated, async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login')
  }
  res.render('remove-from-cart', {session: req.session});
});

app.post('/remove-from-cart', isAuthenticated, async (req, res) => {
  const { product_id } = req.body;
  // user authentication only allowed
  if (!req.session.userId) {
    return res.redirect('/login')
  }

  if (!product_id || isNaN(product_id)){
    return res.send('Invalid product ID');
  }
  const userId = req.session.userId;
  try {
    // check if product is in user's cart
    const cartResult = await pool.query('SELECT * FROM Cart WHERE user_id = $1 AND item_id = $2', [userId, product_id]);
    const cartItem = cartResult.rows[0];
    if (!cartItem) {return res.send('Product not found in your cart');}
    else {
      await pool.query('DELETE FROM Cart WHERE user_id = $1 AND item_id = $2', [userId, product_id]);
      res.send('Product successfully removed from your cart');
    } 
  } catch (error) {
    console.error(error);
    res.send('Error removing product from cart. Please try again later');
  }
});


// Route: Display cart
// TODO: Retrieve and display the user's cart items
app.get('/display-cart', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  
  try {
    // Query to get all items in the cart for the user
    const cartQuery = `
      SELECT p.product_id, p.name, c.quantity, p.price, p.stock_quantity
      FROM Cart c
      JOIN Products p ON c.item_id = p.product_id
      WHERE c.user_id = $1
      ORDER BY p.product_id;  -- Ensure products are ordered by Product ID
    `;
    
    const cartResult = await pool.query(cartQuery, [userId]);
    const cartItems = cartResult.rows;
    
    if (cartItems.length === 0) {
      return res.send('Your cart is empty');
    }

    // Calculate total price for the user
    let totalPrice = 0;
    cartItems.forEach(item => {
      item.totalPrice = item.price * item.quantity;
      totalPrice += item.totalPrice;
      item.stockStatus = item.stock_quantity >= item.quantity ? 'In Stock' : 'Out of Stock';
    });

    // Pass cart items and total price to the ejs template
    res.render('display-cart', { cartItems, totalPrice, session: req.session });
  } catch (error) {
    console.error(error);
    res.send('Error fetching cart items. Please try again later');
  }
});


// Route: Place order (clear cart)
// TODO: Implement order placement logic
app.post('/place-order', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;

  try {
    // 1. Retrieve the user's cart items
    const cartResult = await pool.query('SELECT * FROM Cart WHERE user_id = $1', [userId]);
    const cartItems = cartResult.rows;

    if (cartItems.length === 0) {
      return res.send('Your cart is empty');
    }

    // 2. Check if there's enough stock for each product in the cart
    for (const item of cartItems) {
      const productResult = await pool.query('SELECT * FROM Products WHERE product_id = $1', [item.item_id]);
      const product = productResult.rows[0];

      if (product.stock_quantity < item.quantity) {
        return res.send(`Insufficient stock for ${product.name}`);
      }
    }

    // 3. Calculate total amount for the order
    let totalAmount = 0;
    for (const item of cartItems) {
      const productResult = await pool.query('SELECT price FROM Products WHERE product_id = $1', [item.item_id]);
      const productPrice = productResult.rows[0].price;
      totalAmount += productPrice * item.quantity;
    }

    // 4. Insert order details into Orders table
    const orderResult = await pool.query(
      'INSERT INTO Orders (user_id, total_amount) VALUES ($1, $2) RETURNING order_id',
      [userId, totalAmount]
    );
    const orderId = orderResult.rows[0].order_id;
    
    // 5. Insert order items into OrderItems table
    for (const item of cartItems) {
      const productResult = await pool.query('SELECT price FROM Products WHERE product_id = $1', [item.item_id]);
      const productPrice = productResult.rows[0].price;

      // Insert into OrderItems
      await pool.query(
        'INSERT INTO OrderItems (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.item_id, item.quantity, productPrice]
      );

      // 6. Update product stock
      await pool.query(
        'UPDATE Products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2',
        [item.quantity, item.item_id]
      );
    }
    // 7. Clear items from the user's cart
    await pool.query('DELETE FROM Cart WHERE user_id = $1', [userId]);

    // 8. Redirect to the order confirmation page
    res.redirect('/order-confirmation');
  } catch (error) {
    console.error(error);
    res.send('Error placing order. Please try again later.');
  }
});


// Route: Order confirmation
// TODO: Display order confirmation details
app.get('/order-confirmation', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  try {
    // 1. Fetch the most recent order for the user
    const orderResult = await pool.query(
      'SELECT * FROM Orders WHERE user_id = $1 ORDER BY order_date DESC LIMIT 1',
      [userId]
    );
    const order = orderResult.rows[0];

    if (!order) {
      return res.send('No order found');
    }
    // 2. Fetch the items for the order
    const orderItemsResult = await pool.query(
      'SELECT oi.product_id, oi.quantity, oi.price, p.name FROM OrderItems oi JOIN Products p ON oi.product_id = p.product_id WHERE oi.order_id = $1',
      [order.order_id]
    );
    const orderItems = orderItemsResult.rows;
    order.totalAmount = parseFloat(order.totalAmount)

    // 3. Render the order confirmation page
    res.render('order-confirmation', {
      order,
      orderItems
    });
  } catch (error) {
    console.error(error);
    res.send('Error fetching order details. Please try again later.');
  }
});


// Route: Logout (destroy session)
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send('Error logging out');
    }
    res.redirect('/login');
  });
});
