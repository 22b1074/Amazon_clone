// Presentation catalog layer.
//
// The Products table stores only: product_id, name, price, stock_quantity.
// Everything an editorial storefront needs on top of that (category, collection,
// copy, rating, imagery) lives here and is derived deterministically from the
// product name/id. No randomness, so a product looks identical on every request.
//
// When real columns arrive (category, image_url, rating), delete the matching
// lookup below and read the column instead. The views won't need to change.

const brand = {
  name: 'ÉCRU',
  tagline: 'Objects for considered living.',
  since: '2016',
  city: 'Copenhagen',
};

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

const collections = [
  {
    slug: 'atelier',
    name: 'Atelier',
    subtitle: 'Wardrobe',
    blurb: 'Cloth cut for the long run: considered proportions, honest fibres, nothing shouted.',
    categories: ['Apparel', 'Footwear'],
    tone: 'clay',
  },
  {
    slug: 'maison',
    name: 'Maison',
    subtitle: 'The Home',
    blurb: 'Pieces that hold a room together. Warm timber, quiet steel, surfaces that age well.',
    categories: ['Living', 'Appliances', 'Pantry'],
    tone: 'sage',
  },
  {
    slug: 'studio',
    name: 'Studio',
    subtitle: 'Work & Read',
    blurb: 'Tools for focused hours. Technology and paper chosen for how little they interrupt.',
    categories: ['Technology', 'Library'],
    tone: 'stone',
  },
  {
    slug: 'ritual',
    name: 'Ritual',
    subtitle: 'Daily Practice',
    blurb: 'Small ceremonies of colour, movement and play. The unhurried parts of an ordinary day.',
    categories: ['Beauty', 'Sport', 'Play'],
    tone: 'rose',
  },
];

const tones = {
  clay:  { bg: '#EFE7DC', wash: '#E4D7C5', ink: '#8A7861' },
  sage:  { bg: '#E9EDE6', wash: '#D7E0D2', ink: '#6F7F66' },
  stone: { bg: '#EBEAE7', wash: '#DBD9D3', ink: '#6B6862' },
  rose:  { bg: '#F2E9E6', wash: '#E8D9D3', ink: '#A08379' },
};

// ---------------------------------------------------------------------------
// Per-product editorial metadata, keyed by the seeded product name
// ---------------------------------------------------------------------------

const meta = {
  'Smartphone':    { category: 'Technology', title: 'Kestrel Handset',      sub: 'Aluminium · Matte graphite',   story: 'A phone designed to be picked up less often. Muted display tuning, a body milled from a single billet, and haptics soft enough to feel like paper.', material: 'Anodised aluminium, ceramic glass', care: 'Wipe with a dry microfibre cloth.', glyph: 'phone' },
  'Laptop':        { category: 'Technology', title: 'Atelier Notebook 14',  sub: 'Machined shell · 14 inch',     story: 'Fourteen inches of quiet. A fanless chassis, a keyboard weighted for long sessions, and a finish that softens rather than scratches.', material: 'Recycled aluminium unibody', care: 'Clean vents twice yearly.', glyph: 'laptop' },
  'Refrigerator':  { category: 'Appliances', title: 'Larder Cold Store',    sub: 'Cabinet finish · 320L',        story: 'Cold storage that reads as furniture. Flush handles, a fluted door panel, and a compressor tuned below conversation level.', material: 'Powder-coated steel, oak trim', care: 'Vacuum the rear coil annually.', glyph: 'fridge' },
  'Microwave':     { category: 'Appliances', title: 'Halo Countertop Oven', sub: 'Inverter · 25L',               story: 'A countertop oven without the arcade. One dial, one dark-glass panel, and a chime you can actually live with.', material: 'Brushed stainless, tempered glass', care: 'Wipe interior after use.', glyph: 'microwave' },
  'T-Shirt':       { category: 'Apparel',    title: 'Everyday Cotton Tee',  sub: 'Heavyweight jersey · Unisex',  story: 'Knitted at 240gsm on vintage loopwheel machines, so the body drapes instead of clinging. It gets better around the fortieth wash.', material: '100% organic long-staple cotton', care: 'Machine wash cold. Line dry.', glyph: 'tshirt' },
  'Jeans':         { category: 'Apparel',    title: 'Tapered Selvedge Jean',sub: 'Raw denim · 13.5oz',           story: 'Woven on shuttle looms in a mill that has not changed its recipe since 1948. Raw, unsanforised, and yours to fade.', material: '13.5oz Japanese selvedge denim', care: 'Wash sparingly, inside out.', glyph: 'jeans' },
  'Novel':         { category: 'Library',    title: 'The Long Quiet',       sub: 'Paperback · 312 pages',        story: 'A slow novel about a house, a coastline, and the year nobody left. Printed on uncoated stock with generous margins.', material: 'FSC uncoated paper, sewn binding', care: 'Keep out of direct sun.', glyph: 'novel' },
  'Textbook':      { category: 'Library',    title: 'Principles, Vol. II',  sub: 'Clothbound · 640 pages',       story: 'A reference built to be opened flat and left open. Sewn sections, a ribbon marker, and diagrams redrawn by hand.', material: 'Cloth over board, sewn sections', care: 'Store upright.', glyph: 'textbook' },
  'Tennis Racket': { category: 'Sport',      title: 'Court Racket 300',     sub: 'Graphite · 300g strung',       story: 'Balanced a touch head-light for control over power. The grip is unlacquered leather that darkens with the season.', material: 'Graphite composite, leather grip', care: 'Restring every 40 hours.', glyph: 'racket' },
  'Soccer Ball':   { category: 'Sport',      title: 'Match Ball No. 5',     sub: 'Hand-stitched · Size 5',       story: 'Thirty-two panels, hand-stitched and latex-bladdered. It holds a true line in wind and takes a wet pitch without gaining weight.', material: 'Textured PU, latex bladder', care: 'Inflate to 0.8 bar.', glyph: 'ball' },
  'Lipstick':      { category: 'Beauty',     title: 'Soft Matte Lip',       sub: 'Shade No. 04 · Dune',          story: 'A muted clay-rose that reads as your own colour, warmed. Pigment suspended in shea and jojoba so it stays soft all day.', material: 'Shea butter, jojoba, mineral pigment', care: 'Store below 25°C.', glyph: 'lipstick' },
  'Foundation':    { category: 'Beauty',     title: 'Second Skin Base',     sub: '24 shades · Satin finish',     story: 'Buildable coverage that stops short of a mask. Formulated with squalane, so it settles into skin rather than sitting on it.', material: 'Squalane, niacinamide, mineral filter', care: 'Shake before use.', glyph: 'foundation' },
  'Toy Car':       { category: 'Play',       title: 'Beech Roadster',       sub: 'Solid beech · Ages 3+',        story: 'Turned from a single block of beech and finished in food-safe oil. No batteries, no noise, no instructions.', material: 'Solid beech, linseed oil finish', care: 'Wipe clean. Re-oil yearly.', glyph: 'car' },
  'Puzzle':        { category: 'Play',       title: 'Horizon Puzzle',       sub: '1000 pieces · Die-cut',        story: 'A thousand pieces of a single gradient sky. Difficult in the best way, and framable once it is done.', material: 'Recycled board, soy inks', care: 'Keep dry.', glyph: 'puzzle' },
  'Dining Table':  { category: 'Living',     title: 'Plank Dining Table',   sub: 'Solid oak · Seats six',        story: 'One slab of European oak on a mitred frame, joined without visible hardware. It will outlast the room you put it in.', material: 'Solid European oak, hardwax oil', care: 'Re-oil every 12 months.', glyph: 'table' },
  'Sofa':          { category: 'Living',     title: 'Low Arm Sofa',         sub: 'Bouclé · Three seat',          story: 'A deep, low seat in undyed bouclé over a kiln-dried beech frame. Cushions are feather-wrapped and meant to be plumped.', material: 'Undyed bouclé, beech frame', care: 'Rotate cushions weekly.', glyph: 'sofa' },
  'Rice Bag':      { category: 'Pantry',     title: 'Heirloom Rice',        sub: 'Single estate · 5kg',          story: 'Short-grain rice from one terraced estate, rested six months before milling. It steams sweet and holds its shape.', material: 'Single-estate short grain', care: 'Airtight, out of light.', glyph: 'rice' },
  'Cooking Oil':   { category: 'Pantry',     title: 'First Press Oil',      sub: 'Cold pressed · 750ml',         story: 'Pressed within four hours of harvest and bottled in dark glass. Grassy, faintly peppery, best used raw.', material: 'Cold-pressed olives, dark glass', care: 'Use within 3 months of opening.', glyph: 'oil' },
  'Running Shoes': { category: 'Footwear',   title: 'Trail Runner Low',     sub: 'Knit upper · Unisex',          story: 'A neutral daily trainer with a compressed-foam midsole that stays lively past 500km. The upper breathes without going sheer.', material: 'Engineered knit, EVA midsole', care: 'Air dry. Never machine wash.', glyph: 'shoes' },
  'Sandals':       { category: 'Footwear',   title: 'Leather Slide',        sub: 'Vegetable tanned · Unisex',    story: 'Two straps of vegetable-tanned leather over a cork footbed that moulds to you in about a week.', material: 'Veg-tanned leather, cork footbed', care: 'Condition at season end.', glyph: 'sandals' },
};

const fallbackMeta = {
  category: 'Studio',
  title: null,
  sub: 'Considered essentials',
  story: 'A quietly made piece, chosen for how well it wears over time.',
  material: 'Responsibly sourced materials',
  care: 'Handle with care.',
  glyph: 'puzzle',
};

// Curated merchandising sets, by product_id.
const NEW_ARRIVAL_IDS = new Set([4, 9, 14, 19, 11]);
const BEST_SELLER_IDS = [5, 16, 2, 19, 1, 15, 12, 6];

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toNumber(value) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function formatPrice(value) {
  return toNumber(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Stable pseudo-rating in [4.2, 4.9] so a product never changes score between loads.
function ratingFor(id) {
  return Math.round((4.2 + ((id * 37) % 8) / 10) * 10) / 10;
}

function reviewCountFor(id) {
  return 24 + ((id * 53) % 180);
}

function collectionFor(category) {
  return collections.find((c) => c.categories.includes(category)) || collections[2];
}

/** Turn a raw Products row into everything a template needs. */
function decorate(row) {
  if (!row) return null;
  const info = meta[row.name] || fallbackMeta;
  const collection = collectionFor(info.category);
  const id = Number(row.product_id);
  const price = toNumber(row.price);
  const stock = Number(row.stock_quantity);

  return {
    ...row,
    id,
    price,
    priceLabel: formatPrice(price),
    stock,
    inStock: stock > 0,
    lowStock: stock > 0 && stock <= 10,
    rawName: row.name,
    title: info.title || row.name,
    sub: info.sub,
    story: info.story,
    material: info.material,
    care: info.care,
    glyph: info.glyph,
    category: info.category,
    categorySlug: slugify(info.category),
    collection,
    tone: tones[collection.tone],
    rating: ratingFor(id),
    reviews: reviewCountFor(id),
    isNew: NEW_ARRIVAL_IDS.has(id),
    href: `/product/${id}`,
  };
}

function decorateAll(rows) {
  return (rows || []).map(decorate).filter(Boolean);
}

function categoriesOf(products) {
  const seen = new Map();
  products.forEach((p) => {
    const entry = seen.get(p.category) || { name: p.category, slug: p.categorySlug, count: 0 };
    entry.count += 1;
    seen.set(p.category, entry);
  });
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function sortProducts(products, sort) {
  const list = [...products];
  switch (sort) {
    case 'price-asc':  return list.sort((a, b) => a.price - b.price);
    case 'price-desc': return list.sort((a, b) => b.price - a.price);
    case 'name':       return list.sort((a, b) => a.title.localeCompare(b.title));
    case 'rating':     return list.sort((a, b) => b.rating - a.rating);
    case 'new':        return list.sort((a, b) => Number(b.isNew) - Number(a.isNew) || a.id - b.id);
    default:           return list.sort((a, b) => a.id - b.id);
  }
}

function bestSellers(products, limit = 8) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const picked = BEST_SELLER_IDS.map((id) => byId.get(id)).filter(Boolean);
  const rest = products.filter((p) => !BEST_SELLER_IDS.includes(p.id));
  return [...picked, ...rest].slice(0, limit);
}

function newArrivals(products, limit = 4) {
  const flagged = products.filter((p) => p.isNew);
  const rest = products.filter((p) => !p.isNew);
  return [...flagged, ...rest].slice(0, limit);
}

function related(products, product, limit = 4) {
  if (!product) return products.slice(0, limit);
  const sameCollection = products.filter(
    (p) => p.id !== product.id && p.collection.slug === product.collection.slug
  );
  const rest = products.filter(
    (p) => p.id !== product.id && p.collection.slug !== product.collection.slug
  );
  return [...sameCollection, ...rest].slice(0, limit);
}

// ---------------------------------------------------------------------------
// Art direction: inline SVG stand-ins for product photography.
// Deterministic per product, themed to its collection. Replace `productArt`
// with an <img src="<%= product.image_url %>"> once real photography exists.
// ---------------------------------------------------------------------------

const glyphs = {
  phone:      'M35 8h30a6 6 0 0 1 6 6v72a6 6 0 0 1-6 6H35a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z M43 17h14',
  laptop:     'M22 26h56v40H22z M11 66h78l-6 11H17z',
  fridge:     'M28 9h44v82H28z M28 43h44 M64 24v12 M64 54v12',
  microwave:  'M11 29h78v43H11z M19 37h45v27H19z M75 40v9 M75 58v3',
  tshirt:     'M30 20 12 30l8 14 10-6v43h40V38l10 6 8-14-18-10z M30 20h12a8 8 0 0 0 16 0h12',
  jeans:      'M32 15h36l4 76H58l-8-45-8 45H28z M32 30h36',
  novel:      'M50 27c-8-8-20-10-34-8v52c14-2 26 0 34 8 8-8 20-10 34-8V19c-14-2-26 0-34 8z M50 27v56',
  textbook:   'M17 33h58v13H17z M21 46h58v13H21z M13 59h58v13H13z',
  racket:     'M50 8a21 27 0 1 0 .1 0z M50 63v29 M37 28h26 M50 17v23',
  ball:       'M50 13a37 37 0 1 0 .1 0z M50 30l17 12-6 20H39l-6-20z',
  lipstick:   'M38 45h24v45H38z M41 45V21h18v24 M41 21l18-9v9',
  foundation: 'M41 27h18v9c9 4 13 10 13 19v33H28V55c0-9 4-15 13-19z M45 14h10v13H45z',
  car:        'M13 61l11-19h30l16 19h16v14H13z M31 75a7 7 0 1 0 .1 0 M67 75a7 7 0 1 0 .1 0',
  puzzle:     'M20 24h24a6 6 0 1 1 12 0h24v24a6 6 0 1 0 0 12v24H56a6 6 0 1 0-12 0H20z',
  table:      'M9 40h82v9H9z M21 49v42 M79 49v42 M21 62h58',
  sofa:       'M14 51V39a8 8 0 0 1 16 0v11h40V39a8 8 0 0 1 16 0v12 M14 51h72v22H14z M22 73v10 M78 73v10',
  rice:       'M32 27c-6 14-12 24-12 40a30 24 0 0 0 60 0c0-16-6-26-12-40z M32 27h36 M40 19l10 8 10-8',
  oil:        'M42 12h16v13c10 6 14 14 14 24v39H28V49c0-10 4-18 14-24z M50 53c6 8 8 12 8 16a8 8 0 1 1-16 0c0-4 2-8 8-16z',
  shoes:      'M13 67c0-14 4-24 12-30l10 8 10-6c14 10 26 16 38 18 6 2 8 6 8 10v8H13z M13 75h78',
  sandals:    'M34 17a18 18 0 0 1 20 0 M30 25c-8 12-8 30-4 44 3 10 8 16 14 16s11-6 14-16c4-14 4-32-4-44z',
};

/**
 * Art-directed placeholder image for a product.
 * @param {object} product decorated product
 * @param {{ratio?: string, seedOffset?: number}} [opts] ratio: 'portrait' | 'square' | 'wide'
 */
function productArt(product, opts = {}) {
  const tone = (product && product.tone) || tones.stone;
  const glyph = glyphs[(product && product.glyph)] || glyphs.puzzle;
  const seed = ((product && product.id) || 1) + (opts.seedOffset || 0);

  const ratios = { portrait: [800, 1000], square: [800, 800], wide: [1200, 800] };
  const [w, h] = ratios[opts.ratio] || ratios.portrait;

  // Deterministic variation so a grid of cards doesn't look rubber-stamped.
  const cx = w * (0.30 + ((seed * 17) % 40) / 100);
  const cy = h * (0.28 + ((seed * 29) % 30) / 100);
  const r = Math.min(w, h) * (0.40 + ((seed * 13) % 18) / 100);
  const uid = `a${seed}${opts.ratio || 'p'}${opts.seedOffset || 0}`;

  const glyphScale = Math.min(w, h) * 0.0052;
  const gx = (w - 100 * glyphScale) / 2;
  const gy = (h - 100 * glyphScale) / 2;

  return `<svg class="art" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeAttr(
    (product && product.title) || 'Product'
  )}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g${uid}" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="${tone.bg}"/>
      <stop offset="100%" stop-color="${tone.wash}"/>
    </linearGradient>
    <radialGradient id="r${uid}" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g${uid})"/>
  <circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="${tone.wash}" opacity="0.7"/>
  <ellipse cx="${(w * 0.5).toFixed(0)}" cy="${(h * 0.82).toFixed(0)}" rx="${(w * 0.30).toFixed(0)}" ry="${(h * 0.045).toFixed(0)}" fill="${tone.ink}" opacity="0.10"/>
  <rect width="${w}" height="${h}" fill="url(#r${uid})"/>
  <g transform="translate(${gx.toFixed(1)} ${gy.toFixed(1)}) scale(${glyphScale.toFixed(3)})"
     fill="none" stroke="${tone.ink}" stroke-width="2.4" stroke-linecap="round"
     stroke-linejoin="round" opacity="0.62">
    <path d="${glyph}"/>
  </g>
</svg>`;
}

/** Abstract editorial artwork for hero / story sections (not tied to a product). */
function sceneArt(toneName, variant = 0, ratio = 'wide') {
  const tone = tones[toneName] || tones.sage;
  const ratios = { portrait: [800, 1000], square: [900, 900], wide: [1400, 900] };
  const [w, h] = ratios[ratio] || ratios.wide;
  const uid = `s${toneName}${variant}${ratio}`;
  const shift = variant * 90;

  return `<svg class="art" viewBox="0 0 ${w} ${h}" role="presentation" aria-hidden="true" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g${uid}" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="${tone.bg}"/>
      <stop offset="100%" stop-color="${tone.wash}"/>
    </linearGradient>
    <linearGradient id="v${uid}" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${tone.ink}" stop-opacity="0.20"/>
      <stop offset="60%" stop-color="${tone.ink}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g${uid})"/>
  <circle cx="${(w * 0.68 + shift).toFixed(0)}" cy="${(h * 0.34).toFixed(0)}" r="${(h * 0.40).toFixed(0)}" fill="#FFFFFF" opacity="0.34"/>
  <circle cx="${(w * 0.26 - shift / 2).toFixed(0)}" cy="${(h * 0.70).toFixed(0)}" r="${(h * 0.32).toFixed(0)}" fill="${tone.ink}" opacity="0.10"/>
  <path d="M0 ${(h * 0.74).toFixed(0)} Q ${(w * 0.35).toFixed(0)} ${(h * 0.60).toFixed(0)} ${(w * 0.62).toFixed(0)} ${(h * 0.72).toFixed(0)} T ${w} ${(h * 0.66).toFixed(0)} L ${w} ${h} L 0 ${h} Z" fill="${tone.wash}" opacity="0.75"/>
  <rect width="${w}" height="${h}" fill="url(#v${uid})"/>
</svg>`;
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

module.exports = {
  brand,
  collections,
  tones,
  decorate,
  decorateAll,
  categoriesOf,
  sortProducts,
  bestSellers,
  newArrivals,
  related,
  productArt,
  sceneArt,
  formatPrice,
  slugify,
};
