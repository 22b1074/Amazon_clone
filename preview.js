/**
 * Static preview builder. Renders the real EJS views against the data.sql seed
 * data and writes browsable HTML into ./preview, so the design can be reviewed
 * without a live PostgreSQL connection.
 *
 *   node preview.js      then open preview/index.html
 *
 * This is a dev convenience only. Nothing in the app requires it, and the
 * whole ./preview folder is safe to delete.
 */
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const catalog = require('./lib/catalog');

const VIEWS = path.join(__dirname, 'views');
const OUT = path.join(__dirname, 'preview');

// ── Seed data, mirroring data.sql ────────────────────────────────────────────
const seed = [
  [1, 'Smartphone', 699.99, 50], [2, 'Laptop', 999.99, 30], [3, 'Refrigerator', 499.99, 20],
  [4, 'Microwave', 199.99, 25], [5, 'T-Shirt', 19.99, 100], [6, 'Jeans', 49.99, 60],
  [7, 'Novel', 14.99, 80], [8, 'Textbook', 89.99, 40], [9, 'Tennis Racket', 79.99, 15],
  [10, 'Soccer Ball', 29.99, 50], [11, 'Lipstick', 9.99, 200], [12, 'Foundation', 24.99, 150],
  [13, 'Toy Car', 14.99, 100], [14, 'Puzzle', 9.99, 120], [15, 'Dining Table', 299.99, 10],
  [16, 'Sofa', 499.99, 5], [17, 'Rice Bag', 19.99, 70], [18, 'Cooking Oil', 9.99, 90],
  [19, 'Running Shoes', 79.99, 40], [20, 'Sandals', 29.99, 60],
].map(([product_id, name, price, stock_quantity]) => ({
  product_id, name, price: String(price), stock_quantity,
}));

const products = catalog.decorateAll(seed);
const collectionList = catalog.collections.map((c) => Object.assign({}, c, {
  count: products.filter((p) => p.collection.slug === c.slug).length,
}));

const cartItems = [products[15], products[4], products[18]].map((p, i) => {
  const item = Object.assign({}, p);
  item.quantity = i === 1 ? 2 : 1;
  item.totalPrice = item.price * item.quantity;
  item.stockStatus = 'In Stock';
  return item;
});
const cartTotal = cartItems.reduce((s, i) => s + i.totalPrice, 0);

// ── Route → preview filename ────────────────────────────────────────────────
const ROUTES = {
  '/': 'index.html',
  '/shop': 'shop.html',
  '/list-products': 'shop.html',
  '/collections': 'collections.html',
  '/new-arrivals': 'new-arrivals.html',
  '/about': 'about.html',
  '/wishlist': 'wishlist.html',
  '/display-cart': 'cart.html',
  '/checkout': 'checkout.html',
  '/login': 'login.html',
  '/signup': 'signup.html',
  '/dashboard': 'dashboard.html',
  '/order-confirmation': 'order.html',
  '/add-to-cart': 'add-to-cart.html',
  '/remove-from-cart': 'remove-from-cart.html',
  '/logout': 'index.html',
};

function mapRoute(url) {
  const [rawPath, hash] = url.split('#');
  const [clean] = rawPath.split('?');
  let file = ROUTES[clean];
  if (!file) {
    if (clean.startsWith('/product/')) file = 'product.html';
    else if (clean.startsWith('/collections/')) file = 'shop.html';
    else file = 'index.html';
  }
  return file + (hash ? '#' + hash : '');
}

/** Point assets at the real public/ folder and route links at preview files. */
function localise(html) {
  return html
    .replace(/(href|src)="\/(css|js)\//g, '$1="../public/$2/')
    .replace(/href="(\/[^"]*)"/g, (m, url) => `href="${mapRoute(url)}"`);
}

// ── Pages ───────────────────────────────────────────────────────────────────
const base = { catalog, year: new Date().getFullYear(), cartCount: 4 };
const signedIn = { userId: 7 };
const buildUrl = () => 'shop.html';

const listing = (over) => Object.assign({
  products,
  categories: catalog.categoriesOf(products),
  activeCategory: '',
  query: '',
  sort: '',
  totalCount: products.length,
  pageTitle: 'The Collection',
  eyebrow: 'Shop',
  pageIntro: 'Every piece we currently make, in one place. Filter by category, or sort by what matters to you.',
  buildUrl,
}, over);

const PAGES = [
  ['index.html', 'home-page.ejs', '/', {
    products,
    featuredCollections: collectionList,
    bestSellers: catalog.bestSellers(products, 8),
    newArrivals: catalog.newArrivals(products, 4),
    testimonials: [
      { text: 'It arrived wrapped in cloth, not plastic, and that told me most of what I needed to know before I even opened it.', by: 'Elena M.', place: 'Milan' },
      { text: 'Four years in and the oak has gone the colour they said it would. I have never had furniture improve before.', by: 'Thomas R.', place: 'Bristol' },
      { text: 'I bought one thing to test them and have since replaced half my kitchen. Nothing has needed replacing twice.', by: 'Naomi K.', place: 'Kyoto' },
    ],
  }],
  ['shop.html', 'products.ejs', '/shop', listing()],
  ['new-arrivals.html', 'products.ejs', '/new-arrivals', listing({
    products: products.filter((p) => p.isNew),
    pageTitle: 'New Arrivals',
    eyebrow: 'Just In',
    pageIntro: 'The most recent pieces to leave the workshop. Small runs, and rarely repeated.',
  })],
  ['product.html', 'product-detail.ejs', '/product/15', {
    product: products[14],
    relatedProducts: catalog.related(products, products[14], 4),
  }],
  ['collections.html', 'collections.ejs', '/collections', {
    collectionList, totalCount: products.length,
  }],
  ['about.html', 'about.ejs', '/about', {}],
  ['wishlist.html', 'wishlist.ejs', '/wishlist', { products }],
  ['cart.html', 'display-cart.ejs', '/display-cart', {
    cartItems, totalPrice: cartTotal, shipping: 0,
    grandTotal: cartTotal, freeThreshold: 150,
  }],
  ['cart-empty.html', 'display-cart.ejs', '/display-cart', {
    cartItems: [], totalPrice: 0, shipping: 0, grandTotal: 0, freeThreshold: 150,
  }],
  ['checkout.html', 'checkout.ejs', '/checkout', {
    cartItems, totalPrice: cartTotal, shipping: 0, grandTotal: cartTotal,
    standardCost: 0, expressCost: 24, freeThreshold: 150,
    values: {
      ship_name: '', ship_line1: '', ship_line2: '', ship_city: '',
      ship_postcode: '', ship_phone: '', ship_method: 'standard',
    },
    errors: [], fieldErrors: {},
  }],
  ['checkout-errors.html', 'checkout.ejs', '/checkout', {
    cartItems, totalPrice: cartTotal, shipping: 0, grandTotal: cartTotal,
    standardCost: 0, expressCost: 24, freeThreshold: 150,
    values: {
      ship_name: '', ship_line1: '12 Kasturba Road', ship_line2: '', ship_city: '',
      ship_postcode: '', ship_phone: 'abc', ship_method: 'express',
    },
    errors: [
      { field: 'ship_name', message: 'Enter the full name the delivery should go to.' },
      { field: 'ship_city', message: 'Enter the city.' },
      { field: 'ship_postcode', message: 'Enter the postcode.' },
      { field: 'ship_phone', message: 'Enter a phone number using digits, spaces, or + ( ) - only.' },
    ],
    fieldErrors: {
      ship_name: 'Enter the full name the delivery should go to.',
      ship_city: 'Enter the city.',
      ship_postcode: 'Enter the postcode.',
      ship_phone: 'Enter a phone number using digits, spaces, or + ( ) - only.',
    },
  }],
  ['login.html', 'login.ejs', '/login', {}, {}],
  ['signup.html', 'signup.ejs', '/signup', {}, {}],
  ['dashboard.html', 'dashboard.ejs', '/dashboard', {
    totalCount: products.length, suggestions: catalog.bestSellers(products, 4),
  }],
  ['add-to-cart.html', 'add-to-cart.ejs', '/add-to-cart', { products }],
  ['remove-from-cart.html', 'remove-from-cart.ejs', '/remove-from-cart', {}],
  ['order.html', 'order-confirmation.ejs', '/order-confirmation', {
    order: {
      order_id: 1042, order_date: new Date(), total_amount: String(cartTotal + 24),
      shipping_cost: '24.00', ship_method: 'express',
      ship_name: 'Preethi Chappidi', ship_line1: '12 Kasturba Road',
      ship_line2: 'Flat 4B, Rose Court', ship_city: 'Mumbai',
      ship_postcode: '400001', ship_phone: '+91 98200 12345',
    },
    orderItems: cartItems,
    suggestions: products.slice(5, 9),
  }],
  ['message.html', 'message.ejs', '/add-to-cart', {
    heading: 'Added to your cart',
    body: 'Plank Dining Table is being held for you. Nothing is reserved until the order is placed.',
    tone: 'success',
    actions: [
      { href: '/display-cart', label: 'View Cart', primary: true },
      { href: '/shop', label: 'Continue Shopping' },
    ],
  }],
];

fs.mkdirSync(OUT, { recursive: true });

let failed = 0;
PAGES.forEach(([outFile, view, currentPath, locals, sessionOverride]) => {
  try {
    const rendered = ejs.render(
      fs.readFileSync(path.join(VIEWS, view), 'utf8'),
      Object.assign({}, base, {
        session: sessionOverride === undefined ? signedIn : sessionOverride,
        currentPath,
      }, locals),
      { filename: path.join(VIEWS, view) }
    );
    fs.writeFileSync(path.join(OUT, outFile), localise(rendered), 'utf8');
    console.log(`  ${outFile.padEnd(22)} ${(rendered.length / 1024).toFixed(1)}kb`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${outFile}: ${err.message.split('\n')[0]}`);
  }
});

console.log(
  failed
    ? `\n${failed} page(s) failed.`
    : `\n${PAGES.length} pages written to ./preview. Open preview/index.html`
);
process.exit(failed ? 1 : 0);
