/* Café food & drink menu for the illy Caffe — National Harbor (Oxon Hill) branch.
   Source of truth: the cafe's own Toast online-ordering storefront
   (order.toasttab.com/online/illy-caffe-oxon-hill). Prices are the REAL in-cafe
   Toast prices — NOT the marked-up DoorDash/order.online prices.

   Structure per item:
     id          – stable slug
     name        – display name
     desc        – description (omitted when the cafe shows none)
     price       – starting price in USD (for variant items this is the smallest size)
     sizes       – [{ name, price }] for items with a required Size choice; omit otherwise
     outOfStock  – true when the cafe currently marks it 86'd

   Shared drink modifiers (milk, syrups, extras, temperature) are captured once in
   window.ILLY_MENU.modifiers and referenced by drinks via `modifiers: [...]`.
   Scraped 2026-06-07. */
window.ILLY_MENU = window.ILLY_MENU || {};

window.ILLY_MENU.store = {
  name: "illy Caffe — National Harbor",
  addressLines: ["138 Waterfront Street", "Oxon Hill, MD 20745"],
  phoneDisplay: "+1 (301) 500-1077",
  phoneHref: "+13015001077",
  hours: "Online ordering 8:00 AM – 6:10 PM",
  orderUrl: "https://order.toasttab.com/online/illy-caffe-oxon-hill?diningOption=takeout"
};

/* Real item photos. Two sources:
     - `photo`  : DoorDash storefront CDN GUID (food/drink photos), expanded via photoBase.
     - `img`    : a full URL (e.g. official illy.com product images reused for retail machines).
   Items with neither fall back to a placeholder in the UI. */
window.ILLY_MENU.photoBase =
  "https://img.cdn4dd.com/cdn-cgi/image/fit=contain,width=1200,height=672,format=auto/" +
  "https://doordash-static.s3.amazonaws.com/media/photosV2/";
window.ILLY_MENU.photoUrl = function (item) {
  if (!item) return null;
  if (item.img) return item.img;
  if (item.photo) return window.ILLY_MENU.photoBase + item.photo;
  return null;
};

/* Reusable modifier groups shared across espresso-bar drinks.
   `required` = a choice must be made; `max` = max selectable (null = unlimited). */
window.ILLY_MENU.modifiers = {
  milk: {
    name: "Milk", required: false, max: 1,
    options: [
      { name: "Whole Milk" }, { name: "Skim Milk" },
      { name: "Oat Milk", price: 0.95 }, { name: "Almond Milk", price: 0.95 },
      { name: "Half & Half" }, { name: "Heavy Cream" }
    ]
  },
  syrups095: {
    name: "Syrups", required: false, max: null,
    options: [
      "Vanilla", "Almond", "Caramel", "Coconut", "Dulce de Leche", "Hazelnut",
      "Honey", "Lavender", "Mocha", "Peppermint", "Pistachio", "Pumpkin Spice",
      "Raspberry", "Rose", "Sugar Free Caramel", "Sugar Free Vanilla",
      "Simple Syrup", "Strawberry", "Toffee Nut", "Vanilla Spice", "White Mocha"
    ].map(function (n) { return { name: n, price: 0.95 }; })
  },
  syrups070: {
    name: "Additional Syrups", required: false, max: null,
    options: [
      "Caramel Sauce", "Caramel Syrup", "Hazelnut Syrup", "Lavender Syrup",
      "Mocha Sauce", "Peppermint Syrup", "Simple Syrup", "Sugar Free Vanilla",
      "Vanilla Syrup", "White Mocha Sauce", "Coconut Syrup", "Almond Syrup",
      "Rose Syrup"
    ].map(function (n) { return { name: n, price: 0.70 }; })
  },
  extras: {
    name: "Extras", required: false, max: null,
    options: [
      { name: "Extra Shot", price: 1.50 },
      { name: "Whipped Cream", price: 0.90 },
      { name: "Light Ice" }, { name: "No Ice" }
    ]
  },
  temperature: {
    name: "Temperature", required: false, max: 1,
    options: [{ name: "Hot" }, { name: "Iced" }]
  },
  espressoSelection: {
    name: "Espresso Selection", required: false, max: 1,
    options: [{ name: "Classico" }, { name: "Decaf" }, { name: "Brasile" }]
  }
};

window.ILLY_MENU.categories = [
  {
    id: "breakfast-sandwiches",
    name: "Breakfast Sandwiches",
    items: [
      { id: "bacon-cheddar-egg", name: "Bacon, Cheddar & Egg", price: 9.00,
        photo: "29abb938-c650-42bc-95de-28c1f5d78143-retina-large.jpg",
        desc: "Bacon, cage-free egg and cheddar cheese on a croissant bun." },
      { id: "sausage-cheddar-egg", name: "Sausage, Cheddar & Egg", price: 9.00 },
      { id: "egg-swiss", name: "Egg & Swiss", price: 8.00,
        photo: "44ba2264-391a-4173-94bc-3c2ff3bcb494-retina-large.jpg",
        desc: "Cage-free egg and Swiss cheese on a croissant bun." },
      { id: "avocado-egg-swiss", name: "Avocado, Egg & Swiss", price: 10.00,
        photo: "fff0eb86-dbd3-400d-b6eb-2430c444696a-retina-large.jpg",
        desc: "Fresh avocado spread, cage-free egg and Swiss cheese on a croissant bun." }
    ]
  },
  {
    id: "bagels",
    name: "Bagels",
    items: [
      { id: "bagel-smoked-salmon", name: "Bagel with Smoked Salmon", price: 11.50,
        photo: "50a46c53-f453-426b-8064-f377f3b6ed0d-retina-large.jpg",
        desc: "Bagel of your choice, smoked salmon, cream cheese, capers and fresh herbs." },
      { id: "bagel-cream-cheese", name: "Bagel with Cream Cheese", price: 5.50,
        desc: "Bagel of your choice with whipped cream cheese. A timeless classic." },
      { id: "bagel-butter", name: "Bagel with Butter", price: 4.00 }
    ]
  },
  {
    id: "avocado-toasts",
    name: "Avocado Toasts",
    items: [
      { id: "avocado-toast", name: "Avocado Toast", price: 10.00,
        photo: "b97ec77a-0889-4852-a4a3-a34e55b6e0cf-retina-large.jpg",
        desc: "Fresh avocado spread on a toasted flaky loaf with capers, salt and pepper and topped with poppy seeds." },
      { id: "smoked-salmon-avocado-toast", name: "Smoked Salmon Avocado Toast", price: 15.00,
        photo: "8c72a68f-193e-45bf-a547-3acb7afbe55f-retina-large.jpg",
        desc: "Smoked salmon, avocado, capers, lemon, and dill on a toasted flaky loaf." }
    ]
  },
  {
    id: "pancakes",
    name: "Pancakes",
    items: [
      { id: "classic-pancakes", name: "Classic Pancakes", price: 12.00,
        photo: "37cf4156-2e21-41b9-9f46-dd05994520ed-retina-large.jpg",
        desc: "Fluffy stack of pancakes served with butter and maple syrup." },
      { id: "nutella-pancakes", name: "Nutella Pancakes", price: 13.50,
        photo: "20afbf30-27e1-4bc9-ab0c-a7103f166dc1-retina-large.jpg",
        desc: "Fluffy pancakes layered with creamy Nutella and powdered sugar." }
    ]
  },
  {
    id: "bakery-pastries",
    name: "Bakery & Pastries",
    items: [
      { id: "butter-croissant", name: "Butter Croissant", price: 4.50 },
      { id: "chocolate-croissant", name: "Chocolate Croissant", price: 5.50 },
      { id: "spinach-feta", name: "Spinach and Feta", price: 6.50 },
      { id: "margherita-bistro", name: "Margherita Bistro", price: 6.50 },
      { id: "chocolate-muffin", name: "Chocolate Muffin", price: 5.50 },
      { id: "custard-filled-croissant", name: "Custard-Filled Croissant", price: 5.50 },
      { id: "nutella-croissant", name: "Nutella Croissant", price: 5.50 },
      { id: "ham-cheese-croissant", name: "Ham & Cheese Croissant", price: 5.50 },
      { id: "cinnamon-roll", name: "Cinnamon Roll", price: 5.50 },
      { id: "classic-muffin", name: "Classic Muffin", price: 5.50 },
      { id: "lemon-bar", name: "Lemon Bar", price: 7.00 },
      { id: "pecan-bar", name: "Pecan Bar", price: 7.00,
        photo: "94c1630c-961c-4976-9dae-a017ad3ebb4c-retina-large.jpg" },
      { id: "baci-di-dama-cookie", name: "Baci di Dama Cookie", price: 2.00 },
      { id: "strawberry-cheese-danish", name: "Strawberry Cheese Danish", price: 5.50 }
    ]
  },
  {
    id: "salads-lunch",
    name: "Salads — Lunch",
    items: [
      { id: "chicken-caesar-salad", name: "Chicken Caesar Salad", price: 12.00,
        desc: "Grilled chicken breast, crisp romaine, croutons, parmesan and Caesar dressing. A timeless favorite." },
      { id: "smoked-salmon-caesar-salad", name: "Smoked Salmon Caesar Salad", price: 14.00,
        photo: "1e5c9a52-107e-4094-a716-f80a1d57e108-retina-large.jpg",
        desc: "Smoked salmon, crisp romaine, croutons, parmesan and Caesar dressing. A fresh take on a classic Caesar." }
    ]
  },
  {
    id: "sandwiches-lunch",
    name: "Sandwiches — Lunch",
    items: [
      { id: "prosciutto-mozzarella", name: "Prosciutto & Mozzarella", price: 13.50,
        photo: "639d444e-224f-4b52-9e3f-586eb4c87104-retina-large.jpg",
        desc: "Aged prosciutto, fresh mozzarella, balsamic glaze and basil on focaccia." },
      { id: "chicken-pesto-sandwich", name: "Chicken Pesto Sandwich", price: 14.50,
        photo: "7d86b7c6-b3f1-46f7-8538-95acf6a17d76-retina-large.jpg",
        desc: "Grilled chicken breast, fresh mozzarella, tomatoes, arugula and basil pesto on toasted focaccia bread." },
      { id: "ham-swiss", name: "Ham & Swiss", price: 13.50,
        photo: "9de68edb-8402-4ab1-9e9e-dc4969160917-retina-large.jpg",
        desc: "Smoked ham, Swiss cheese, lettuce and Dijon on focaccia bread." },
      { id: "caprese-sandwich", name: "Caprese Sandwich", price: 12.50,
        photo: "bc04eca2-f0ad-4390-81be-4c01c618920f-retina-large.jpg",
        desc: "Fresh mozzarella, tomatoes, and basil leaves on focaccia bread." },
      { id: "turkey-avocado", name: "Turkey Avocado", price: 14.50 }
    ]
  },
  {
    id: "pasta-lunch",
    name: "Pasta — Lunch",
    items: [
      { id: "tomato-basil", name: "Tomato & Basil", price: 15.50,
        photo: "c4a98f50-cbd1-4d39-a9f6-9ea5ea2567df-retina-large.jpg",
        desc: "Spaghetti in a light tomato sauce with fresh basil and parmesan cheese. Simple, fresh and flavorful." },
      { id: "alfredo", name: "Alfredo", price: 16.50, outOfStock: true,
        desc: "Fettuccine with a cream, butter and Parmigiano Reggiano PDO. Rich, smooth and comforting." },
      { id: "ravioli", name: "Ravioli", price: 16.00, outOfStock: true,
        desc: "Ravioli stuffed with ricotta and spinach, topped with a tomato and basil sauce. Classic Italian comfort food." }
    ]
  },
  {
    id: "sweets",
    name: "Sweets",
    items: [
      { id: "brownie", name: "Brownie", price: 7.50,
        photo: "aa969681-d863-4c03-b148-2e7495516a3b-retina-large.jpg" },
      { id: "chocolate-eclair", name: "Chocolate Eclair", price: 7.00 },
      { id: "vanilla-eclair", name: "Vanilla Eclair", price: 7.00 },
      { id: "coffee-eclair", name: "Coffee Eclair", price: 7.00 },
      { id: "chocolate-hazelnut-donut", name: "Chocolate Hazelnut Donut", price: 5.00 },
      { id: "coconut-clambella", name: "Coconut Clambella", price: 5.00 },
      { id: "cheesecake", name: "Cheesecake", price: 9.00,
        photo: "b7642385-1236-4cc0-ade1-d488d82de678-retina-large.jpg" },
      { id: "waffle", name: "Waffle", price: 5.00 },
      { id: "chocolate-truffle-mousse", name: "Chocolate Truffle Mousse", price: 9.50 },
      { id: "red-velvet-cake", name: "Red Velvet Cake", price: 9.50 },
      { id: "carrot-cake", name: "Carrot Cake", price: 9.50 },
      { id: "strawberry-shortcake", name: "Strawberry Shortcake", price: 10.00 },
      { id: "tiramisu", name: "Tiramisu", price: 9.50 }
    ]
  },
  {
    id: "gelato",
    name: "Gelato",
    // All gelato share: 1 Scoop $5.50 / 2 Scoop $9.50
    items: [
      { id: "gelato-vanilla-bean", name: "Vanilla Bean", price: 5.50,
        sizes: [{ name: "1 Scoop", price: 5.50 }, { name: "2 Scoop", price: 9.50 }] },
      { id: "gelato-chocolate", name: "Chocolate", price: 5.50,
        sizes: [{ name: "1 Scoop", price: 5.50 }, { name: "2 Scoop", price: 9.50 }] },
      { id: "gelato-mango-sorbet", name: "Mango Sorbet", price: 5.50,
        sizes: [{ name: "1 Scoop", price: 5.50 }, { name: "2 Scoop", price: 9.50 }] },
      { id: "gelato-pistachio", name: "Pistachio", price: 5.50,
        sizes: [{ name: "1 Scoop", price: 5.50 }, { name: "2 Scoop", price: 9.50 }] },
      { id: "gelato-italian-espresso", name: "Italian Espresso", price: 5.50,
        sizes: [{ name: "1 Scoop", price: 5.50 }, { name: "2 Scoop", price: 9.50 }] },
      { id: "gelato-salted-caramel", name: "Salted Caramel", price: 5.50,
        sizes: [{ name: "1 Scoop", price: 5.50 }, { name: "2 Scoop", price: 9.50 }] }
    ]
  },
  {
    id: "small-espresso-drinks",
    name: "Small Espresso Drinks",
    items: [
      { id: "espresso", name: "Espresso", price: 3.50,
        sizes: [{ name: "Single", price: 3.50 }, { name: "Double", price: 4.50 },
                { name: "Triple", price: 6.00 }, { name: "Quad", price: 7.50 }],
        modifiers: ["espressoSelection", "syrups095", "extras"] },
      { id: "espresso-macchiato", name: "Espresso Macchiato", price: 3.75,
        sizes: [{ name: "Single", price: 3.75 }, { name: "Double", price: 4.75 }],
        modifiers: ["espressoSelection", "milk", "syrups095", "extras"] },
      { id: "americano", name: "Americano", price: 4.00,
        sizes: [{ name: "Single (8oz)", price: 4.00 }, { name: "Double (12oz)", price: 5.00 },
                { name: "Triple (16oz)", price: 6.00 }],
        modifiers: ["espressoSelection", "temperature", "syrups070"] }
    ]
  },
  {
    id: "espresso-bar",
    name: "Espresso Bar (Hot & Cold)",
    items: [
      { id: "caffe-latte", name: "Caffè Latte", price: 5.90,
        sizes: [{ name: "Regular", price: 5.90 }, { name: "Large", price: 6.90 }],
        modifiers: ["milk", "syrups070", "extras", "temperature"] },
      { id: "cappuccino", name: "Cappuccino", price: 5.75,
        sizes: [{ name: "Regular", price: 5.75 }, { name: "Large", price: 6.75 }],
        modifiers: ["milk", "syrups070", "extras", "temperature"] },
      { id: "cappuccino-viennese", name: "Cappuccino Viennese", price: 5.90,
        sizes: [{ name: "Regular", price: 5.90 }, { name: "Large", price: 6.90 }],
        modifiers: ["milk", "syrups070", "extras", "temperature"] },
      { id: "caffe-mocha", name: "Caffè Mocha", price: 6.25,
        sizes: [{ name: "Regular", price: 6.25 }, { name: "Large", price: 7.25 }],
        modifiers: ["milk", "syrups070", "extras", "temperature"] },
      { id: "salted-caramel-latte", name: "Salted Caramel Latte", price: 6.25,
        sizes: [{ name: "Regular", price: 6.25 }, { name: "Large", price: 7.25 }],
        modifiers: ["milk", "syrups070", "extras", "temperature"] },
      { id: "lavender-mint-latte", name: "Lavender Mint Latte", price: 6.25,
        sizes: [{ name: "Regular", price: 6.25 }, { name: "Large", price: 7.25 }],
        modifiers: ["milk", "syrups070", "extras", "temperature"] },
      { id: "espresso-shakerato", name: "Espresso Shakerato", price: 5.50,
        sizes: [{ name: "Regular", price: 5.50 }, { name: "Large", price: 6.50 }],
        modifiers: ["syrups070", "extras"] },
      { id: "cappuccino-shakerato", name: "Cappuccino Shakerato", price: 6.00,
        sizes: [{ name: "Regular", price: 6.00 }, { name: "Large", price: 7.00 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "affogato", name: "Affogato", price: 6.50,
        sizes: [{ name: "Regular", price: 6.50 }, { name: "Large", price: 7.50 }] },
      { id: "cold-brew", name: "Cold Brew", price: 5.90, outOfStock: true,
        sizes: [{ name: "Regular", price: 5.90 }, { name: "Large", price: 6.90 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "coconut-cold-brew", name: "Coconut Cold Brew", price: 6.50, outOfStock: true,
        sizes: [{ name: "Regular", price: 6.50 }, { name: "Large", price: 7.50 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "caramel-cream-cold-brew", name: "Caramel Cream Cold Brew", price: 6.50, outOfStock: true,
        sizes: [{ name: "Regular", price: 6.50 }, { name: "Large", price: 7.50 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "illy-crema", name: "Illy Crema", price: 4.50,
        sizes: [{ name: "Regular", price: 4.50 }, { name: "Large", price: 6.50 }] },
      { id: "cortado", name: "Cortado", price: 3.75,
        sizes: [{ name: "One Shot", price: 3.75 }, { name: "Two Shots", price: 4.75 }],
        modifiers: ["espressoSelection", "milk"] },
      { id: "cappuccino-freddo-greco", name: "Cappuccino Freddo Greco", price: 6.25, outOfStock: true,
        sizes: [{ name: "Regular", price: 6.25 }, { name: "Large", price: 7.25 }],
        modifiers: ["milk", "syrups070"] }
    ]
  },
  {
    id: "rtd-drinks",
    name: "RTD Drinks",
    items: [
      { id: "diet-coke", name: "Diet Coke", price: 3.95 },
      { id: "coke", name: "Coke", price: 4.25 },
      { id: "san-pellegrino-water", name: "San Pellegrino — Sparkling Mineral Water", price: 4.95,
        photo: "068922dc-2672-4bf6-ac83-21e7ee54af94-retina-large.png" },
      { id: "acqua-panna", name: "Acqua Panna — Still Water", price: 4.95 },
      { id: "san-pellegrino-aranciata", name: "San Pellegrino — Aranciata Sparkling Water", price: 3.75 },
      { id: "san-pellegrino-limonata", name: "San Pellegrino — Limonata Sparkling Water", price: 3.75 },
      { id: "foco-coconut-water", name: "Foco Organic Coconut Water 16.9oz", price: 4.00 },
      { id: "cranberry-juice", name: "Cranberry Juice", price: 3.50 },
      { id: "orange-juice", name: "Orange Juice", price: 3.50 },
      { id: "apple-juice", name: "Apple Juice", price: 3.50 },
      { id: "illy-cold-brew", name: "illy Cold Brew", price: 5.90 },
      { id: "illy-cold-brew-cappuccino", name: "illy Cold Brew Cappuccino", price: 5.90 },
      { id: "illy-cold-brew-latte-macchiato", name: "illy Cold Brew Latte Macchiato", price: 5.90 },
      { id: "lemonade", name: "Lemonade", price: 4.50 }
    ]
  },
  {
    id: "a-la-carte",
    name: "A La Carte",
    items: [
      { id: "bacon-2", name: "Bacon (2)", price: 1.99 },
      { id: "egg-1", name: "Egg (1)", price: 2.00 },
      { id: "pancake-1", name: "Pancake (1)", price: 3.99 },
      { id: "smoked-salmon-2oz", name: "Smoked Salmon (2oz)", price: 5.00 },
      { id: "chicken-breast-3oz", name: "Chicken Breast (3oz)", price: 4.00 }
    ]
  },
  {
    id: "retail",
    name: "Retail",
    items: [
      { id: "whole-bean", name: "Whole Bean", price: 16.49 },
      { id: "ground-beans", name: "Ground Beans", price: 16.49 },
      { id: "k-cups", name: "K-Cups", price: 13.99 },
      { id: "iperespresso-capsules-18ct", name: "iperEspresso Capsules 18ct", price: 18.99 },
      { id: "ese-pods-18ct", name: "E.S.E. Pods 18ct", price: 16.00 },
      { id: "dammann-tea-breakfast", name: "Dammann Loose Tea — Breakfast", price: 22.00 },
      { id: "dammann-tea-earl-grey", name: "Dammann Loose Tea — Earl Grey Yin Zhen", price: 22.00 },
      { id: "y33-machine-red", name: "Y3.3 iperEspresso Machine — Red", price: 170.00,
        img: "../assets/www.illy.com/dw/image/v2/BBDD_PRD/on/demandware.static/-/Sites-masterCatalog_illycaffe/default/dwf1b30cef/products/sfra/machines/Medium2x/60383_Medium_2x_01.24bf6a82aa.png" },
      { id: "illy-easy-machine-red", name: "illy Easy Espresso Machine — Red", price: 250.00,
        img: "../assets/www.illy.com/dw/image/v2/BBDD_PRD/on/demandware.static/-/Sites-masterCatalog_illycaffe/default/dw4dc98960/products/sfra/machines/Medium2x/60453_Medium_2x_01.a8080044b8.png" },
      { id: "x71-machine-red", name: "X7.1 iperEspresso Machine — Red", price: 450.00,
        img: "../assets/www.illy.com/dw/image/v2/BBDD_PRD/on/demandware.static/-/Sites-masterCatalog_illycaffe/default/dw2bef78cf/products/sfra/machines/Medium2x/6606_Medium_2x_01.fcd5ca8543.png" }
    ]
  },
  {
    id: "brewed-coffee",
    name: "Brewed Coffee",
    items: [
      { id: "regular-coffee", name: "Regular Coffee", price: 4.00 },
      { id: "large-coffee", name: "Large Coffee", price: 5.00 },
      { id: "coffee-to-go-box", name: "Coffee To Go Box", price: 24.00, outOfStock: true }
    ]
  },
  {
    id: "tea-lattes",
    name: "Tea Lattes",
    items: [
      { id: "chai-latte", name: "Chai Latte", price: 6.50,
        sizes: [{ name: "Regular", price: 6.50 }, { name: "Large", price: 7.50 }],
        modifiers: ["milk", "syrups070"] },
      { id: "matcha-latte", name: "Matcha Latte", price: 6.50,
        sizes: [{ name: "Regular", price: 6.50 }, { name: "Large", price: 7.50 }],
        modifiers: ["milk", "syrups070"] },
      { id: "hot-tea", name: "Hot Tea", price: 4.50,
        sizes: [{ name: "Regular", price: 4.50 }, { name: "Large", price: 5.50 }],
        modifiers: ["milk", "syrups070"] },
      { id: "iced-tea", name: "Iced Tea", price: 5.00,
        sizes: [{ name: "Regular", price: 5.00 }, { name: "Large", price: 6.00 }],
        modifiers: ["syrups070"] }
    ]
  },
  {
    id: "hot-chocolate",
    name: "Hot Chocolate",
    items: [
      { id: "kids-hot-chocolate", name: "Kids Hot Chocolate", price: 3.50 },
      { id: "regular-hot-chocolate", name: "Regular Hot Chocolate", price: 4.50 },
      { id: "large-hot-chocolate", name: "Large Hot Chocolate", price: 5.50 }
    ]
  }
];

/* Flat lookup helpers */
window.ILLY_MENU.allItems = function () {
  return window.ILLY_MENU.categories.reduce(function (acc, c) {
    return acc.concat(c.items.map(function (i) {
      return Object.assign({ category: c.id, categoryName: c.name }, i);
    }));
  }, []);
};

window.ILLY_MENU.findItem = function (id) {
  return window.ILLY_MENU.allItems().filter(function (i) { return i.id === id; })[0] || null;
};
