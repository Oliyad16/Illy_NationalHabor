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
  hours: "Mon–Thu 6:30 AM–3 PM · Fri–Sun 6:30 AM–4 PM",
  orderUrl: "https://order.toasttab.com/online/illy-caffe-oxon-hill"
};

/* Real item photos. Two sources:
     - `photo`  : a local copy of the original DoorDash item photo (food/drink),
                  stored in assets/menu-photos/ and expanded via photoBase.
     - `img`    : a full URL (e.g. official illy.com product images reused for retail machines).
   Items with neither fall back to a placeholder in the UI.
   Path is relative to /pages/, so prefixed with ../ */
window.ILLY_MENU.photoBase = "../assets/menu-photos/";
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

/* Reconciled 2026-10-05 to match the cafe's current printed menu (two laminated
   pages supplied by ownership). Per ownership: "no new items — mainly subtractions."
   Items, sections, and prices below mirror those two pages exactly. Existing item
   photos/descriptions are retained for surviving items. The previous full list is
   preserved in menu.js.bak. */
window.ILLY_MENU.categories = [
  /* ============================= FOOD ============================= */
  {
    id: "bakery",
    name: "Bakery",
    items: [
      { id: "butter-croissant", name: "Butter Croissant", price: 4.50,
        desc: "Golden, flaky, layers of buttery goodness." },
      { id: "custard-filled-croissant", name: "Custard-Filled Croissant", price: 5.50,
        desc: "Smooth vanilla custard filling." },
      { id: "chocolate-croissant", name: "Chocolate Croissant", price: 5.50,
        desc: "Dark chocolate in a Parisian-style croissant." },
      { id: "chocolate-muffin", name: "Chocolate Muffin", price: 6.00,
        desc: "Freshly baked — ask for today's flavors." },
      { id: "strawberry-cheese-danish", name: "Strawberry Cheese Danish", price: 5.50,
        desc: "All-butter dough, cream cheese, strawberry jam." },
      { id: "chocolate-hazelnut-donut", name: "Chocolate Hazelnut Donut", price: 5.00,
        desc: "Filled with cocoa and hazelnut cream." },
      { id: "eclairs", name: "Éclairs", price: 7.00,
        desc: "Choux pastry, pastry cream, shiny glaze." },
      { id: "baci-di-dama", name: "Baci di Dama", price: 2.00,
        desc: "Traditional Italian hazelnut cookie with chocolate." },
      { id: "pecan-bar", name: "Pecan Bar", price: 7.00,
        photo: "94c1630c-961c-4976-9dae-a017ad3ebb4c-retina-large.jpg",
        desc: "Buttery crust, whole pecans, caramel." },
      { id: "lemon-bar", name: "Lemon Bar", price: 7.00,
        desc: "Shortbread crust, tangy lemon curd." },
      { id: "cheesecake", name: "Cheesecake", price: 5.00,
        photo: "b7642385-1236-4cc0-ade1-d488d82de678-retina-large.jpg",
        desc: "Creamy cheesecake, buttery crust." },
      { id: "waffle", name: "Waffle", price: 5.00,
        desc: "Golden, fluffy — perfect with coffee or gelato." }
    ]
  },
  {
    id: "breakfast-sandwiches",
    name: "Breakfast Sandwiches",
    items: [
      { id: "egg-swiss", name: "Egg & Swiss", price: 8.00,
        photo: "44ba2264-391a-4173-94bc-3c2ff3bcb494-retina-large.jpg",
        desc: "Cage-free egg, Swiss cheese on a croissant bun." },
      { id: "bacon-cheddar-egg", name: "Bacon, Cheddar & Egg", price: 9.00,
        photo: "29abb938-c650-42bc-95de-28c1f5d78143-retina-large.jpg",
        desc: "Bacon, cage-free egg, cheddar on a croissant bun." },
      { id: "avocado-egg-swiss", name: "Avocado, Egg & Swiss", price: 10.00,
        photo: "fff0eb86-dbd3-400d-b6eb-2430c444696a-retina-large.jpg",
        desc: "Fresh avocado, cage-free egg, Swiss on a croissant bun." }
    ]
  },
  {
    id: "toasts",
    name: "Toasts",
    items: [
      { id: "avocado-toast", name: "Avocado Toast", price: 10.00,
        photo: "b97ec77a-0889-4852-a4a3-a34e55b6e0cf-retina-large.jpg",
        desc: "Fresh avocado spread on toasted flaky loaf." },
      { id: "smoked-salmon-avocado", name: "Smoked Salmon & Avocado", price: 15.00,
        photo: "8c72a68f-193e-45bf-a547-3acb7afbe55f-retina-large.jpg",
        desc: "Smoked salmon, avocado, capers, fresh herbs on toasted loaf." }
    ]
  },
  {
    id: "bagels",
    name: "Bagels",
    items: [
      { id: "everything-cream-cheese", name: "Everything with Cream Cheese", price: 5.50,
        desc: "Everything bagel, whipped cream cheese." },
      { id: "everything-smoked-salmon", name: "Everything with Smoked Salmon", price: 11.50,
        photo: "50a46c53-f453-426b-8064-f377f3b6ed0d-retina-large.jpg",
        desc: "Smoked salmon, cream cheese, capers, fresh herbs." }
    ]
  },
  {
    id: "pancakes",
    name: "Pancakes",
    items: [
      { id: "classic-pancakes", name: "Classic Pancakes", price: 12.00,
        photo: "37cf4156-2e21-41b9-9f46-dd05994520ed-retina-large.jpg",
        desc: "Fluffy stack with butter and maple syrup." },
      { id: "nutella-pancakes", name: "Nutella Pancakes", price: 13.50,
        photo: "20afbf30-27e1-4bc9-ab0c-a7103f166dc1-retina-large.jpg",
        desc: "Layered with Nutella and powdered sugar." }
    ]
  },
  {
    id: "salads",
    name: "Salads",
    items: [
      { id: "chicken-caesar-salad", name: "Chicken Caesar Salad", price: 12.00,
        desc: "Grilled chicken, crisp romaine, croutons, parmesan." },
      { id: "smoked-salmon-caesar", name: "Smoked Salmon Caesar", price: 14.00,
        photo: "1e5c9a52-107e-4094-a716-f80a1d57e108-retina-large.jpg",
        desc: "Crisp romaine, smoked salmon, croutons, parmesan." }
    ]
  },
  {
    id: "sandwiches",
    name: "Sandwiches",
    items: [
      { id: "caprese-sandwich", name: "Caprese", price: 12.50,
        photo: "bc04eca2-f0ad-4390-81be-4c01c618920f-retina-large.jpg",
        desc: "Fresh mozzarella, tomatoes, basil, focaccia." },
      { id: "ham-swiss", name: "Ham & Swiss", price: 13.50,
        photo: "9de68edb-8402-4ab1-9e9e-dc4969160917-retina-large.jpg",
        desc: "Smoked ham, Swiss, lettuce, Dijon, focaccia." },
      { id: "prosciutto-mozzarella", name: "Prosciutto & Mozzarella", price: 13.50,
        photo: "639d444e-224f-4b52-9e3f-586eb4c87104-retina-large.jpg",
        desc: "Prosciutto, fresh mozzarella, balsamic glaze, focaccia." },
      { id: "chicken-pesto-sandwich", name: "Chicken Pesto", price: 14.50,
        photo: "7d86b7c6-b3f1-46f7-8538-95acf6a17d76-retina-large.jpg",
        desc: "Grilled chicken, mozzarella, arugula, basil pesto, focaccia." }
    ]
  },
  /* ============================= DRINKS ============================= */
  {
    id: "hot-drinks",
    name: "Hot Drinks",
    note: "12 oz · 16 oz",
    items: [
      { id: "cappuccino", name: "Cappuccino", price: 5.75,
        sizes: [{ name: "12 oz", price: 5.75 }, { name: "16 oz", price: 6.75 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "cappuccino-viennese", name: "Cappuccino Viennese", price: 5.90,
        sizes: [{ name: "12 oz", price: 5.90 }, { name: "16 oz", price: 6.90 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "caffe-latte", name: "Caffè Latte", price: 5.90,
        sizes: [{ name: "12 oz", price: 5.90 }, { name: "16 oz", price: 6.90 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "caffe-mocha", name: "Caffè Mocha", price: 6.25,
        sizes: [{ name: "12 oz", price: 6.25 }, { name: "16 oz", price: 7.25 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "lavender-mint-latte", name: "Lavender Mint Latte", price: 6.25,
        sizes: [{ name: "12 oz", price: 6.25 }, { name: "16 oz", price: 7.25 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "salted-caramel-latte", name: "Salted Caramel Latte", price: 6.25,
        sizes: [{ name: "12 oz", price: 6.25 }, { name: "16 oz", price: 7.25 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "drip-coffee", name: "Drip Coffee", price: 4.00,
        sizes: [{ name: "12 oz", price: 4.00 }, { name: "16 oz", price: 5.00 }] },
      { id: "hot-chocolate", name: "Hot Chocolate", price: 4.50,
        sizes: [{ name: "12 oz", price: 4.50 }, { name: "16 oz", price: 5.50 }] },
      { id: "matcha-latte", name: "Matcha Latte", price: 6.50,
        sizes: [{ name: "12 oz", price: 6.50 }, { name: "16 oz", price: 7.50 }],
        modifiers: ["milk", "syrups070"] },
      { id: "chai-latte", name: "Chai Latte", price: 6.50,
        sizes: [{ name: "12 oz", price: 6.50 }, { name: "16 oz", price: 7.50 }],
        modifiers: ["milk", "syrups070"] },
      { id: "hot-tea", name: "Hot Tea", price: 4.50 }
    ]
  },
  {
    id: "cold-drinks",
    name: "Cold Drinks",
    note: "16 oz · 20 oz",
    items: [
      { id: "iced-latte", name: "Iced Latte", price: 5.90,
        sizes: [{ name: "16 oz", price: 5.90 }, { name: "20 oz", price: 6.90 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "iced-mocha", name: "Iced Mocha", price: 6.25,
        sizes: [{ name: "16 oz", price: 6.25 }, { name: "20 oz", price: 7.25 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "iced-lavender-mint-latte", name: "Iced Lavender Mint Latte", price: 6.25,
        sizes: [{ name: "16 oz", price: 6.25 }, { name: "20 oz", price: 7.25 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "iced-matcha-latte", name: "Iced Matcha Latte", price: 6.50,
        sizes: [{ name: "16 oz", price: 6.50 }, { name: "20 oz", price: 7.50 }],
        modifiers: ["milk", "syrups070"] },
      { id: "iced-chai-latte", name: "Iced Chai Latte", price: 6.50,
        sizes: [{ name: "16 oz", price: 6.50 }, { name: "20 oz", price: 7.50 }],
        modifiers: ["milk", "syrups070"] },
      { id: "iced-tropical-black-tea", name: "Iced Tropical Black Tea", price: 5.00,
        sizes: [{ name: "16 oz", price: 5.00 }, { name: "20 oz", price: 6.00 }] },
      { id: "cold-brew", name: "Cold Brew", price: 5.50,
        sizes: [{ name: "16 oz", price: 5.50 }, { name: "20 oz", price: 6.50 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "coconut-cream-cold-brew", name: "Coconut Cream Cold Brew", price: 6.50,
        sizes: [{ name: "16 oz", price: 6.50 }, { name: "20 oz", price: 7.50 }],
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "caramel-cream-cold-brew", name: "Caramel Cream Cold Brew", price: 6.50,
        sizes: [{ name: "16 oz", price: 6.50 }, { name: "20 oz", price: 7.50 }],
        modifiers: ["milk", "syrups070", "extras"] }
    ]
  },
  {
    id: "specialty-cold",
    name: "Specialty Cold",
    items: [
      { id: "espresso-shakerato", name: "Espresso Shakerato", price: 5.90,
        modifiers: ["syrups070", "extras"] },
      { id: "cappuccino-shakerato", name: "Cappuccino Shakerato", price: 6.90,
        modifiers: ["milk", "syrups070", "extras"] },
      { id: "affogato", name: "Affogato", price: 7.00 },
      { id: "illy-crema", name: "illy Crema", price: 7.50 }
    ]
  },
  {
    id: "espresso-americano",
    name: "Espresso & Americano",
    note: "single / double",
    items: [
      { id: "espresso", name: "Espresso (Classico · Decaf)", price: 3.50,
        sizes: [{ name: "Single", price: 3.50 }, { name: "Double", price: 4.50 }],
        modifiers: ["espressoSelection"] },
      { id: "espresso-macchiato", name: "Espresso Macchiato", price: 3.75,
        sizes: [{ name: "Single", price: 3.75 }, { name: "Double", price: 4.75 }],
        modifiers: ["espressoSelection", "milk"] },
      { id: "americano", name: "Americano", price: 4.00,
        sizes: [{ name: "Single", price: 4.00 }, { name: "Double", price: 5.00 }],
        modifiers: ["espressoSelection"] }
    ]
  },
  {
    id: "gelato",
    name: "Gelato",
    note: "Authentic Italian gelato — creamy and rich",
    items: [
      { id: "gelato-1-scoop", name: "1 Scoop", price: 5.50 },
      { id: "gelato-2-scoops", name: "2 Scoops", price: 9.50 },
      { id: "gelato-3-scoops", name: "3 Scoops", price: 12.50 }
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
