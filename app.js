// ROLL NUMBER : 22B1074
require('dotenv').config();
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const catalog = require('./lib/catalog');
const app = express();
const port = Number(process.env.PORT) || 3000;


// PostgreSQL connection, configured via .env (see .env.example).
// Credentials must never be committed; .env is gitignored.
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'amazon_clone',
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT) || 5432,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err.message);
});

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve the design system (CSS, JS)
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// Set up session
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
}));


// ---------------------------------------------------------------------------
// View helpers, available to every template
// ---------------------------------------------------------------------------

app.use(async (req, res, next) => {
  res.locals.session = req.session;
  res.locals.currentPath = req.path;
  res.locals.catalog = catalog;
  res.locals.year = new Date().getFullYear();
  res.locals.cartCount = 0;

  // Header cart badge. Never let this break a page render.
  if (req.session && req.session.userId) {
    try {
      const result = await pool.query(
        'SELECT COALESCE(SUM(quantity), 0) AS n FROM Cart WHERE user_id = $1',
        [req.session.userId]
      );
      res.locals.cartCount = Number(result.rows[0].n) || 0;
    } catch (error) {
      res.locals.cartCount = 0;
    }
  }
  next();
});

/** Fetch every product, already decorated for the templates. */
async function allProducts() {
  const result = await pool.query('SELECT * FROM Products ORDER BY product_id');
  return catalog.decorateAll(result.rows);
}

/** Render the shared status page instead of a bare res.send() of plain text. */
function renderMessage(res, { heading, body, tone = 'success', actions }) {
  return res.render('message', {
    heading,
    body,
    tone,
    actions: actions || [
      { href: '/display-cart', label: 'View Cart', primary: true },
      { href: '/shop', label: 'Continue Shopping' },
    ],
  });
}

/** Build a querystring-preserving URL for filter/sort links. */
function makeBuildUrl(basePath, params) {
  return (overrides) => {
    const next = Object.assign({}, params, overrides);
    const qs = new URLSearchParams();
    Object.keys(next).forEach((key) => {
      if (next[key]) qs.set(key, next[key]);
    });
    const search = qs.toString();
    return basePath + (search ? `?${search}` : '');
  };
}

/** Collections with live product counts. */
function collectionsWithCounts(products) {
  return catalog.collections.map((c) => Object.assign({}, c, {
    count: products.filter((p) => p.collection.slug === c.slug).length,
  }));
}

// Delivery pricing. Single source of truth so the cart, the checkout summary
// and the stored order total can never disagree.
const FREE_SHIPPING_THRESHOLD = 150;
const SHIPPING_RATES = { standard: 12, express: 24 };

function shippingCost(subtotal, method) {
  if (method === 'express') return SHIPPING_RATES.express;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_RATES.standard;
}

const EMPTY_ADDRESS = {
  ship_name: '', ship_line1: '', ship_line2: '', ship_city: '',
  ship_postcode: '', ship_phone: '', ship_method: 'standard',
};

/** Trim and bound every address field; return the cleaned values. */
function cleanAddress(body) {
  const take = (key, max) => String(body[key] || '').trim().slice(0, max);
  return {
    ship_name: take('ship_name', 120),
    ship_line1: take('ship_line1', 200),
    ship_line2: take('ship_line2', 200),
    ship_city: take('ship_city', 120),
    ship_postcode: take('ship_postcode', 24),
    ship_phone: take('ship_phone', 40),
    ship_method: body.ship_method === 'express' ? 'express' : 'standard',
  };
}

/** Validate a cleaned address. Returns { errors, fieldErrors }. */
function validateAddress(values) {
  const required = [
    ['ship_name', 'Enter the full name the delivery should go to.'],
    ['ship_line1', 'Enter the street address.'],
    ['ship_city', 'Enter the city.'],
    ['ship_postcode', 'Enter the postcode.'],
  ];
  const fieldErrors = {};
  const errors = [];

  required.forEach(([field, message]) => {
    if (!values[field]) {
      fieldErrors[field] = message;
      errors.push({ field, message });
    }
  });

  if (values.ship_phone && !/^[0-9+()\s-]{6,}$/.test(values.ship_phone)) {
    const message = 'Enter a phone number using digits, spaces, or + ( ) - only.';
    fieldErrors.ship_phone = message;
    errors.push({ field: 'ship_phone', message });
  }

  return { errors, fieldErrors };
}

/** Load the signed-in user's cart, decorated, with totals. */
async function loadCart(userId) {
  const result = await pool.query(
    `SELECT p.product_id, p.name, c.quantity, p.price, p.stock_quantity
     FROM Cart c
     JOIN Products p ON c.item_id = p.product_id
     WHERE c.user_id = $1
     ORDER BY p.product_id`,
    [userId]
  );

  const cartItems = result.rows.map((row) => {
    const item = catalog.decorate(row);
    item.quantity = row.quantity;
    item.totalPrice = item.price * row.quantity;
    item.stockStatus = row.stock_quantity >= row.quantity ? 'In Stock' : 'Out of Stock';
    return item;
  });

  const totalPrice = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  return { cartItems, totalPrice };
}

const TESTIMONIALS = [
  { text: 'It arrived wrapped in cloth, not plastic, and that told me most of what I needed to know before I even opened it.', by: 'Elena M.', place: 'Milan' },
  { text: 'Four years in and the oak has gone the colour they said it would. I have never had furniture improve before.', by: 'Thomas R.', place: 'Bristol' },
  { text: 'I bought one thing to test them and have since replaced half my kitchen. Nothing has needed replacing twice.', by: 'Naomi K.', place: 'Kyoto' },
];


// ---------------------------------------------------------------------------
// Storefront (public)
// ---------------------------------------------------------------------------

// Route: Home page
app.get('/', async (req, res) => {
  try {
    // Query to get all products
    const result = await pool.query('SELECT * FROM Products');
    const products = catalog.decorateAll(result.rows);

    // Render the 'home-page' template,
    // passing the retrieved product data to the template
    // for rendering within the page.
    res.render('home-page', {
      products,
      featuredCollections: collectionsWithCounts(products),
      bestSellers: catalog.bestSellers(products, 8),
      newArrivals: catalog.newArrivals(products, 4),
      testimonials: TESTIMONIALS,
    });
  } catch (error) {
    console.error(error);
    res.status(500);
    renderMessage(res, {
      heading: 'Something went wrong',
      body: 'We could not load the collection just now. Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/', label: 'Try again', primary: true }],
    });
  }
});

// Route: Shop. Public product listing with category filter, search and sort
app.get('/shop', async (req, res) => {
  try {
    const products = await allProducts();
    const categories = catalog.categoriesOf(products);

    const category = (req.query.category || '').trim();
    const query = (req.query.q || '').trim();
    const sort = (req.query.sort || '').trim();

    let filtered = products;
    if (category) filtered = filtered.filter((p) => p.categorySlug === category);
    if (query) {
      const needle = query.toLowerCase();
      filtered = filtered.filter((p) =>
        p.title.toLowerCase().includes(needle) ||
        p.rawName.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle) ||
        p.collection.name.toLowerCase().includes(needle)
      );
    }

    res.render('products', {
      products: catalog.sortProducts(filtered, sort),
      categories,
      activeCategory: category,
      query,
      sort,
      totalCount: products.length,
      pageTitle: query ? `Search: ${query}` : 'The Collection',
      eyebrow: 'Shop',
      pageIntro: 'Every piece we currently make, in one place. Filter by category, or sort by what matters to you.',
      buildUrl: makeBuildUrl('/shop', { category, q: query, sort }),
    });
  } catch (error) {
    console.error(error);
    res.status(500);
    renderMessage(res, {
      heading: 'Error retrieving products',
      body: 'We could not load the collection just now. Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/shop', label: 'Try again', primary: true }],
    });
  }
});

// Route: New arrivals
app.get('/new-arrivals', async (req, res) => {
  try {
    const products = await allProducts();
    const arrivals = products.filter((p) => p.isNew);

    res.render('products', {
      products: catalog.sortProducts(arrivals.length ? arrivals : products.slice(0, 6), req.query.sort || ''),
      categories: catalog.categoriesOf(products),
      activeCategory: '',
      query: '',
      sort: (req.query.sort || '').trim(),
      totalCount: products.length,
      pageTitle: 'New Arrivals',
      eyebrow: 'Just In',
      pageIntro: 'The most recent pieces to leave the workshop. Small runs, and rarely repeated.',
      buildUrl: makeBuildUrl('/new-arrivals', { sort: req.query.sort }),
    });
  } catch (error) {
    console.error(error);
    res.status(500);
    renderMessage(res, {
      heading: 'Error retrieving products',
      body: 'We could not load new arrivals just now. Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/', label: 'Back home', primary: true }],
    });
  }
});

// Route: Collections index
app.get('/collections', async (req, res) => {
  try {
    const products = await allProducts();
    res.render('collections', {
      collectionList: collectionsWithCounts(products),
      totalCount: products.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500);
    renderMessage(res, {
      heading: 'Error retrieving collections',
      body: 'Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/', label: 'Back home', primary: true }],
    });
  }
});

// Route: Single collection, reuses the listing template
app.get('/collections/:slug', async (req, res) => {
  try {
    const products = await allProducts();
    const collection = catalog.collections.find((c) => c.slug === req.params.slug);

    if (!collection) {
      res.status(404);
      return renderMessage(res, {
        heading: 'Collection not found',
        body: 'That collection does not exist. Browse all four instead.',
        tone: 'warn',
        actions: [{ href: '/collections', label: 'All collections', primary: true }, { href: '/shop', label: 'Shop all' }],
      });
    }

    const inCollection = products.filter((p) => p.collection.slug === collection.slug);
    const sort = (req.query.sort || '').trim();

    res.render('products', {
      products: catalog.sortProducts(inCollection, sort),
      categories: catalog.categoriesOf(inCollection),
      activeCategory: '',
      query: '',
      sort,
      totalCount: products.length,
      pageTitle: collection.name,
      eyebrow: `Collection · ${collection.subtitle}`,
      pageIntro: collection.blurb,
      buildUrl: makeBuildUrl(`/collections/${collection.slug}`, { sort }),
    });
  } catch (error) {
    console.error(error);
    res.status(500);
    renderMessage(res, {
      heading: 'Error retrieving collection',
      body: 'Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/collections', label: 'All collections', primary: true }],
    });
  }
});

// Route: Product detail
app.get('/product/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!Number.isInteger(id)) {
    res.status(404);
    return renderMessage(res, {
      heading: 'Piece not found',
      body: 'That reference number does not match anything we make.',
      tone: 'warn',
      actions: [{ href: '/shop', label: 'Browse the collection', primary: true }],
    });
  }

  try {
    const products = await allProducts();
    const product = products.find((p) => p.id === id);

    if (!product) {
      res.status(404);
      return renderMessage(res, {
        heading: 'Piece not found',
        body: 'That reference number does not match anything we make.',
        tone: 'warn',
        actions: [{ href: '/shop', label: 'Browse the collection', primary: true }],
      });
    }

    res.render('product-detail', {
      product,
      relatedProducts: catalog.related(products, product, 4),
    });
  } catch (error) {
    console.error(error);
    res.status(500);
    renderMessage(res, {
      heading: 'Error retrieving product',
      body: 'Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/shop', label: 'Back to shop', primary: true }],
    });
  }
});

// Route: About / brand story
app.get('/about', (req, res) => {
  res.render('about');
});

// Route: Wishlist. The schema has no wishlist table, so the page ships every
// product and the client filters to what is saved in localStorage.
app.get('/wishlist', async (req, res) => {
  try {
    res.render('wishlist', { products: await allProducts() });
  } catch (error) {
    console.error(error);
    res.status(500);
    renderMessage(res, {
      heading: 'Error retrieving wishlist',
      body: 'Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/shop', label: 'Back to shop', primary: true }],
    });
  }
});


// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

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
    renderMessage(res, {                                  // error msg to display
      heading: 'We could not create your account',
      body: 'That email may already be registered. Please try again, or sign in if you already have an account.',
      tone: 'error',
      actions: [{ href: '/signup', label: 'Try again', primary: true }, { href: '/login', label: 'Sign in' }],
    });
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
      return renderMessage(res, {
        heading: 'Invalid email or password',
        body: 'Please check your details and try again.',
        tone: 'warn',
        actions: [{ href: '/login', label: 'Back to sign in', primary: true }, { href: '/signup', label: 'Create account' }],
      });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return renderMessage(res, {
        heading: 'Invalid email or password',
        body: 'Please check your details and try again.',
        tone: 'warn',
        actions: [{ href: '/login', label: 'Back to sign in', primary: true }, { href: '/signup', label: 'Create account' }],
      });
    }
    req.session.userId = user.user_id;
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    renderMessage(res, {
      heading: 'An error occurred during sign in',
      body: 'Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/login', label: 'Try again', primary: true }],
    });
  }
});


// Route: Dashboard page (requires authentication)
// TODO: Render the dashboard page
app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const products = await allProducts();
    res.render('dashboard', {
      totalCount: products.length,
      suggestions: catalog.bestSellers(products, 4),
    });
  } catch (error) {
    console.error(error);
    res.render('dashboard', { totalCount: 0, suggestions: [] });
  }
});


// ---------------------------------------------------------------------------
// Cart & orders
// ---------------------------------------------------------------------------

// Route: List products
// TODO: Fetch and display all products from the database
app.get('/list-products', isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Products ORDER BY product_id');
    const products = catalog.decorateAll(result.rows);
    const sort = (req.query.sort || '').trim();

    res.render('products', {
      products: catalog.sortProducts(products, sort),
      categories: catalog.categoriesOf(products),
      activeCategory: (req.query.category || '').trim(),
      query: '',
      sort,
      totalCount: products.length,
      pageTitle: 'All Products',
      eyebrow: 'Catalogue',
      pageIntro: 'The complete product list, with live prices and stock straight from the database.',
      buildUrl: makeBuildUrl('/list-products', { category: req.query.category, sort }),
    });
  } catch (error) {
    console.error(error);
    res.status(500);
    renderMessage(res, {                                  // Error retrieving products
      heading: 'Error retrieving products',
      body: 'We could not load the catalogue just now. Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/list-products', label: 'Try again', primary: true }],
    });
  }
});


// Route: Add product to cart
// TODO: Implement "Add to Cart" functionality
app.get('/add-to-cart', isAuthenticated, async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login')
  }
  try {
    res.render('add-to-cart', { session: req.session, products: await allProducts() });
  } catch (error) {
    console.error(error);
    res.render('add-to-cart', { session: req.session, products: [] });
  }
});

app.post('/add-to-cart', isAuthenticated, async (req, res) => {
  const { product_id, quantity } = req.body;
  // check user authentication
  if (!req.session.userId) {
    return res.redirect('/login')
  }
  if (!product_id || !quantity || isNaN(product_id) || isNaN(quantity) || quantity <= 0) {
    return renderMessage(res, {
      heading: 'Invalid reference or quantity',
      body: 'Please enter a valid reference number and a quantity of at least one.',
      tone: 'warn',
      actions: [{ href: '/add-to-cart', label: 'Try again', primary: true }, { href: '/shop', label: 'Browse the collection' }],
    });
  }
  const userId = req.session.userId;
  try {
    const productResult = await pool.query('SELECT * FROM Products WHERE product_id = $1', [product_id]);
    const product = productResult.rows[0];

    if (!product) {
      return renderMessage(res, {
        heading: 'Piece not found',
        body: 'That reference number does not match anything we make.',
        tone: 'warn',
        actions: [{ href: '/shop', label: 'Browse the collection', primary: true }],
      });
    }
    // if (product.stock_quantity < quantity) {return res.send('Insufficient stock');}
    //check if  product already in users cart
    const cartResult = await pool.query('SELECT * FROM Cart WHERE user_id = $1 AND item_id = $2', [userId, product_id]);
    const existingCartItem = cartResult.rows[0];

    let finalQuantity = quantity;

    if (existingCartItem) {
      // update quantity if product is inc art
      finalQuantity = existingCartItem.quantity + parseInt(quantity, 10);
    }
    if (product.stock_quantity < finalQuantity) {
      return renderMessage(res, {
        heading: 'Not enough stock',
        body: `We only have ${product.stock_quantity} of this piece available right now.`,
        tone: 'warn',
        actions: [{ href: `/product/${product.product_id}`, label: 'Back to the piece', primary: true }, { href: '/display-cart', label: 'View cart' }],
      });
    }
    const decorated = catalog.decorate(product);
    if (existingCartItem) {
      await pool.query('UPDATE Cart SET quantity = $1 WHERE user_id = $2 AND item_id = $3', [finalQuantity, userId, product_id]);
      return renderMessage(res, {                         // Product quantity updated in your cart
        heading: 'Cart updated',
        body: `${decorated.title}, quantity is now ${finalQuantity}.`,
        tone: 'success',
      });
    }
    else {
      await pool.query('INSERT INTO Cart (user_id, item_id, quantity) VALUES ($1, $2, $3)', [userId, product_id, finalQuantity]);
      return renderMessage(res, {                         // Product added to your cart
        heading: 'Added to your cart',
        body: `${decorated.title} is being held for you. Nothing is reserved until the order is placed.`,
        tone: 'success',
      });
    }
  } catch (error) {
    console.error(error);
    renderMessage(res, {
      heading: 'Could not add to cart',
      body: 'Something went wrong on our side. Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/shop', label: 'Back to shop', primary: true }],
    });
  }
});


// Route: Remove product from cart
// TODO: Implement "Remove from Cart" functionality
app.get('/remove-from-cart', isAuthenticated, async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login')
  }
  res.render('remove-from-cart', { session: req.session });
});

app.post('/remove-from-cart', isAuthenticated, async (req, res) => {
  const { product_id } = req.body;
  // user authentication only allowed
  if (!req.session.userId) {
    return res.redirect('/login')
  }

  if (!product_id || isNaN(product_id)) {
    return renderMessage(res, {
      heading: 'Invalid reference number',
      body: 'Please enter the reference number of the piece you would like to remove.',
      tone: 'warn',
      actions: [{ href: '/remove-from-cart', label: 'Try again', primary: true }, { href: '/display-cart', label: 'View cart' }],
    });
  }
  const userId = req.session.userId;
  try {
    // check if product is in user's cart
    const cartResult = await pool.query('SELECT * FROM Cart WHERE user_id = $1 AND item_id = $2', [userId, product_id]);
    const cartItem = cartResult.rows[0];
    if (!cartItem) {
      return renderMessage(res, {
        heading: 'Not in your cart',
        body: 'We could not find that piece in your cart.',
        tone: 'warn',
        actions: [{ href: '/display-cart', label: 'View cart', primary: true }, { href: '/shop', label: 'Continue shopping' }],
      });
    }
    else {
      await pool.query('DELETE FROM Cart WHERE user_id = $1 AND item_id = $2', [userId, product_id]);
      return res.redirect('/display-cart');
    }
  } catch (error) {
    console.error(error);
    renderMessage(res, {
      heading: 'Could not remove that piece',
      body: 'Something went wrong on our side. Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/display-cart', label: 'Back to cart', primary: true }],
    });
  }
});


// Route: Display cart
// TODO: Retrieve and display the user's cart items
app.get('/display-cart', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;

  try {
    // Products are ordered by Product ID inside loadCart().
    const { cartItems, totalPrice } = await loadCart(userId);
    const shipping = shippingCost(totalPrice, 'standard');

    // Pass cart items and total price to the ejs template
    // (an empty cart renders the styled empty state rather than plain text)
    res.render('display-cart', {
      cartItems,
      totalPrice,
      shipping,
      grandTotal: totalPrice + shipping,
      freeThreshold: FREE_SHIPPING_THRESHOLD,
      session: req.session,
    });
  } catch (error) {
    console.error(error);
    res.status(500);
    renderMessage(res, {
      heading: 'Error fetching your cart',
      body: 'Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/display-cart', label: 'Try again', primary: true }],
    });
  }
});


// Route: Checkout (delivery address)
app.get('/checkout', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;

  try {
    const { cartItems, totalPrice } = await loadCart(userId);

    if (cartItems.length === 0) {
      return res.redirect('/display-cart');
    }

    const values = Object.assign({}, EMPTY_ADDRESS);
    const shipping = shippingCost(totalPrice, values.ship_method);

    res.render('checkout', {
      cartItems,
      totalPrice,
      shipping,
      grandTotal: totalPrice + shipping,
      standardCost: shippingCost(totalPrice, 'standard'),
      expressCost: SHIPPING_RATES.express,
      freeThreshold: FREE_SHIPPING_THRESHOLD,
      values,
      errors: [],
      fieldErrors: {},
    });
  } catch (error) {
    console.error(error);
    res.status(500);
    renderMessage(res, {
      heading: 'Could not load checkout',
      body: 'Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/display-cart', label: 'Back to cart', primary: true }],
    });
  }
});


// Route: Place order (clear cart)
// TODO: Implement order placement logic
app.post('/place-order', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;

  try {
    // 0. Validate the delivery address before touching stock or orders.
    const values = cleanAddress(req.body);
    const { errors, fieldErrors } = validateAddress(values);

    // 1. Retrieve the user's cart items
    const cartResult = await pool.query('SELECT * FROM Cart WHERE user_id = $1', [userId]);
    const cartItems = cartResult.rows;

    if (cartItems.length === 0) {
      return renderMessage(res, {
        heading: 'Your cart is empty',
        body: 'Add a piece to your cart before placing an order.',
        tone: 'warn',
        actions: [{ href: '/shop', label: 'Browse the collection', primary: true }],
      });
    }

    if (errors.length) {
      const cart = await loadCart(userId);
      const shipping = shippingCost(cart.totalPrice, values.ship_method);
      return res.status(400).render('checkout', {
        cartItems: cart.cartItems,
        totalPrice: cart.totalPrice,
        shipping,
        grandTotal: cart.totalPrice + shipping,
        standardCost: shippingCost(cart.totalPrice, 'standard'),
        expressCost: SHIPPING_RATES.express,
        freeThreshold: FREE_SHIPPING_THRESHOLD,
        values,
        errors,
        fieldErrors,
      });
    }

    // 2. Check if there's enough stock for each product in the cart
    for (const item of cartItems) {
      const productResult = await pool.query('SELECT * FROM Products WHERE product_id = $1', [item.item_id]);
      const product = productResult.rows[0];

      if (product.stock_quantity < item.quantity) {
        return renderMessage(res, {
          heading: 'Not enough stock',
          body: `We no longer have enough of ${catalog.decorate(product).title} to fulfil your order. Please adjust the quantity and try again.`,
          tone: 'warn',
          actions: [{ href: '/display-cart', label: 'Back to cart', primary: true }],
        });
      }
    }

    // 3. Calculate total amount for the order, including delivery
    let subtotal = 0;
    for (const item of cartItems) {
      const productResult = await pool.query('SELECT price FROM Products WHERE product_id = $1', [item.item_id]);
      const productPrice = productResult.rows[0].price;
      subtotal += productPrice * item.quantity;
    }
    const shipping = shippingCost(subtotal, values.ship_method);
    const totalAmount = subtotal + shipping;

    // 4. Insert order details into Orders table, snapshotting the address
    const orderResult = await pool.query(
      `INSERT INTO Orders
         (user_id, total_amount, ship_name, ship_line1, ship_line2,
          ship_city, ship_postcode, ship_phone, ship_method, shipping_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING order_id`,
      [
        userId, totalAmount,
        values.ship_name, values.ship_line1, values.ship_line2 || null,
        values.ship_city, values.ship_postcode, values.ship_phone || null,
        values.ship_method, shipping,
      ]
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
    renderMessage(res, {
      heading: 'Could not place your order',
      body: 'Something went wrong on our side and your cart has not been charged. Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/display-cart', label: 'Back to cart', primary: true }],
    });
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
      return renderMessage(res, {
        heading: 'No orders yet',
        body: 'Once you place an order it will appear here with everything it contained.',
        tone: 'warn',
        actions: [{ href: '/shop', label: 'Browse the collection', primary: true }, { href: '/dashboard', label: 'Back to account' }],
      });
    }
    // 2. Fetch the items for the order
    const orderItemsResult = await pool.query(
      'SELECT oi.product_id, oi.quantity, oi.price, p.name FROM OrderItems oi JOIN Products p ON oi.product_id = p.product_id WHERE oi.order_id = $1',
      [order.order_id]
    );
    const orderItems = orderItemsResult.rows.map((row) => {
      const item = catalog.decorate(Object.assign({ stock_quantity: 0 }, row));
      item.quantity = row.quantity;
      return item;
    });

    const products = await allProducts();
    const orderedIds = orderItems.map((i) => i.product_id);

    // 3. Render the order confirmation page
    res.render('order-confirmation', {
      order,
      orderItems,
      suggestions: products.filter((p) => !orderedIds.includes(p.product_id)).slice(0, 4),
    });
  } catch (error) {
    console.error(error);
    res.status(500);
    renderMessage(res, {
      heading: 'Error fetching order details',
      body: 'Please try again in a moment.',
      tone: 'error',
      actions: [{ href: '/dashboard', label: 'Back to account', primary: true }],
    });
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


// Route: 404
app.use((req, res) => {
  res.status(404);
  renderMessage(res, {
    heading: 'Page not found',
    body: 'The page you were looking for does not exist, or has moved.',
    tone: 'warn',
    actions: [{ href: '/', label: 'Back home', primary: true }, { href: '/shop', label: 'Browse the collection' }],
  });
});


// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
