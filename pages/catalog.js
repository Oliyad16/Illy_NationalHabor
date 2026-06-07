/* Shared product catalog for the illy Caffe — National Harbor branch site.
   Products, prices, and images are the real items mirrored from the homepage.
   Everything here is browse + order-for-in-store-pickup. No subscriptions. */
window.ILLY_BRANCH = window.ILLY_BRANCH || {};

window.ILLY_BRANCH.store = {
  name: "Illy Cafe dmv — National Harbor",
  addressLines: ["138 Waterfront St", "Oxon Hill, MD 20745"],
  phoneDisplay: "+1 (877) 469-4559",
  phoneHref: "+18774694559",
  hours: "Open daily · Closes 7:00 PM"
};

// Image base (relative to /pages/, so prefixed with ../)
var A = "../assets/www.illy.com/dw/image/v2/BBDD_PRD/on/demandware.static/-/Sites-masterCatalog_illycaffe/default/";

window.ILLY_BRANCH.products = [
  {
    id: "I0003859ST",
    name: "Whole Bean Coffee Classico — Medium Roast (500g)",
    category: "coffee",
    price: 30.49,
    img: A + "dw73fd82a0/products/sfra/coffee/High1x/I0003859_High_1x_01.aee10b328d.png",
    blurb: "Our signature Classico blend in whole bean — balanced, smooth, with notes of caramel and chocolate. 500g bag.",
    tag: "Best Seller"
  },
  {
    id: "A119ST",
    name: "Arabica Selection Whole Bean — Brasile Cerrado Mineiro",
    category: "coffee",
    price: 17.29,
    img: A + "dwb9c51f12/products/sfra/coffee/Small1x/A119ST_Small_1x_01.9a8f1ff640.png",
    blurb: "A single-origin Brazilian Arabica with a sweet, full body and notes of toasted nuts."
  },
  {
    id: "8837ST",
    name: "Ground Drip Coffee Classico — Medium Roast",
    category: "coffee",
    price: 17.29,
    img: A + "dw0d7d35df/products/sfra/coffee/Medium1x/8837ST_Medium_1x_01.713e2acae8.png",
    blurb: "Pre-ground for drip brewers. The Classico blend, ready for your morning pour-over or machine.",
    tag: "Best Seller"
  },
  {
    id: "A028",
    name: "iperEspresso Capsules Classico — Medium Roast",
    category: "coffee",
    price: 19.99,
    img: A + "dwe3dcb88b/products/sfra/coffee/High1x/A028_High_1x_02.172bcf58e8.png",
    blurb: "21 iperEspresso capsules of the Classico blend for a crema-rich espresso at the touch of a button.",
    tag: "Best Seller"
  },
  {
    id: "6606",
    name: "X7.1 iperEspresso Machine — Red",
    category: "machines",
    price: 429.00,
    img: A + "dw2bef78cf/products/sfra/machines/Medium2x/6606_Medium_2x_01.fcd5ca8543.png",
    blurb: "Premium iperEspresso capsule machine with a striking red finish. Espresso and free-flow drinks at the touch of a button."
  },
  {
    id: "60383",
    name: "Y3.3 iperEspresso Machine — Red",
    category: "machines",
    price: 169.00,
    img: A + "dwf1b30cef/products/sfra/machines/Medium2x/60383_Medium_2x_01.24bf6a82aa.png",
    blurb: "Compact iperEspresso machine for espresso and coffee. Fits any countertop."
  },
  {
    id: "60453",
    name: "illy Easy Espresso Machine — Red",
    category: "machines",
    price: 249.00,
    img: A + "dw4dc98960/products/sfra/machines/Medium2x/60453_Medium_2x_01.a8080044b8.png",
    blurb: "E.S.E. pod espresso machine — simple, reliable, and easy to clean."
  },
  {
    id: "25404",
    name: "illy Easy Compatible Capsule Machine",
    category: "machines",
    price: 279.00,
    img: A + "dw1dc54a99/products/sfra/machines/Medium2x/25404_Medium_2x_01.d599f71302.png",
    blurb: "Capsule machine compatible with illy Easy capsules. Quick warm-up and one-touch brewing."
  }
];

window.ILLY_BRANCH.findProduct = function (id) {
  return window.ILLY_BRANCH.products.filter(function (p) { return p.id === id; })[0] || null;
};
