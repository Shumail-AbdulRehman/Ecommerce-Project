require("dotenv").config();
const { connectDB, mongoose } = require("../config/db");
const { Category, Product } = require("../models");

const imageSets = {
  electronics: [
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=900&auto=format&q=80",
  ],
  fashion: [
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1594938298603-c8148c4b4f3c?w=900&auto=format&q=80",
  ],
  "home-living": [
    "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900&auto=format&q=80",
  ],
  sports: [
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&auto=format&q=80",
  ],
  beauty: [
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1541643600914-78b084683702?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=900&auto=format&q=80",
  ],
  books: [
    "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=900&auto=format&q=80",
  ],
  watches: [
    "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=900&auto=format&q=80",
  ],
  footwear: [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=900&auto=format&q=80",
  ],
  kitchen: [
    "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=900&auto=format&q=80",
  ],
  travel: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1496950866446-3253e1470e8e?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&q=80",
  ],
  gaming: [
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=900&auto=format&q=80",
    "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=900&auto=format&q=80",
  ],
};

const categories = [
  {
    name: "Electronics",
    slug: "electronics",
    description: "Premium audio, computing, smart devices, charging, and creator tech.",
    names: [
      "Pro Wireless Headphones", "Ultra Slim Laptop", "Smart Watch Series X", "4K Action Camera",
      "Wireless Earbuds Pro", "Mechanical Keyboard", "Wireless Charging Pad", "Portable Bluetooth Speaker",
      "USB-C Travel Dock", "Noise Cancelling Neckband", "Creator LED Desk Lamp", "Smart Home Hub",
      "Compact Power Bank", "Ergonomic Wireless Mouse", "Studio Condenser Mic", "Mini Projector Beam",
      "Fitness Smart Band", "Dual Lens Dash Camera", "Tablet Pro Stand", "Fast GaN Charger",
    ],
  },
  {
    name: "Fashion",
    slug: "fashion",
    description: "Elevated everyday layers, occasion wear, accessories, and polished essentials.",
    names: [
      "Designer Leather Jacket", "Silk Dress", "Linen Blazer", "Cashmere Crew Sweater",
      "Tailored Wool Trousers", "Organic Cotton Shirt", "Satin Evening Skirt", "Ribbed Knit Polo",
      "Oversized Trench Coat", "Structured Tote Bag", "Merino Travel Scarf", "Minimalist Belt",
      "Pleated Wide-Leg Pants", "Denim Utility Overshirt", "Velvet Occasion Jacket", "Cotton Poplin Dress",
      "Relaxed Chino Set", "Cropped Bomber Jacket", "Textured Resort Shirt", "Heritage Field Jacket",
    ],
  },
  {
    name: "Home & Living",
    slug: "home-living",
    description: "Warm home objects, textiles, lighting, tableware, and refined storage.",
    names: [
      "Ceramic Vase Set", "Scented Candle Collection", "Linen Throw Blanket", "Marble Serving Tray",
      "Oak Bedside Organizer", "Rattan Floor Basket", "Matte Stone Dinner Plates", "Brass Table Lamp",
      "Cotton Waffle Towels", "Handwoven Area Rug", "Aroma Diffuser Vessel", "Walnut Photo Frame",
      "Glass Carafe Set", "Velvet Cushion Pair", "Minimal Wall Clock", "Bamboo Laundry Hamper",
      "Stoneware Coffee Mugs", "Textured Curtain Panels", "Modular Shelf Cubes", "Quilted Comforter Set",
    ],
  },
  {
    name: "Sports",
    slug: "sports",
    description: "Training gear, recovery tools, outdoor essentials, and performance equipment.",
    names: [
      "Yoga Mat Premium", "Running Shoes Elite", "Adjustable Dumbbell Pair", "Compression Training Tee",
      "Hydration Running Vest", "Resistance Band Kit", "Foam Recovery Roller", "Trail Trekking Poles",
      "Grip Strength Trainer", "Indoor Cycling Gloves", "Performance Gym Bag", "Jump Rope Speed Pro",
      "Weighted Ankle Set", "Breathable Court Shorts", "Pilates Ring Trainer", "Smart Water Bottle",
      "Balance Board Core", "Training Towel Pack", "Outdoor Fitness Watch", "Foldable Exercise Bench",
    ],
  },
  {
    name: "Beauty",
    slug: "beauty",
    description: "Skincare, fragrance, haircare, grooming, and ritual-grade beauty tools.",
    names: [
      "Vitamin C Serum", "Perfume Noir", "Hydrating Gel Cleanser", "Retinol Night Cream",
      "Rose Clay Face Mask", "Hyaluronic Moisture Cream", "Scalp Renewal Oil", "Silk Sleep Eye Mask",
      "Daily SPF Fluid", "AHA Body Polish", "Botanical Hand Cream", "Ceramic Hair Brush",
      "Mineral Lip Tint", "Brow Sculpt Gel", "Oud Travel Fragrance", "Cooling Eye Patches",
      "Repair Shampoo Bar", "Nourishing Beard Oil", "Facial Ice Roller", "Glow Essence Mist",
    ],
  },
  {
    name: "Books",
    slug: "books",
    description: "Design, business, fiction, culture, personal growth, and beautifully made books.",
    names: [
      "The Design Book", "Modern Retail Playbook", "Architecture of Calm", "The Founder Notes",
      "A Guide to Better Habits", "The Fashion Archive", "Coffee Table Cities", "Mindful Money Manual",
      "Creative Strategy Primer", "The Product Thinking Journal", "Letters from Kyoto", "The Slow Living Guide",
      "Contemporary Interiors", "The Craft of Focus", "Luxury Brand Stories", "Photography Field Notes",
      "The Food Culture Atlas", "Small Business Systems", "The Art of Typography", "Weekend Fiction Collection",
    ],
  },
  {
    name: "Watches",
    slug: "watches",
    description: "Dress watches, field watches, automatic pieces, and everyday timekeeping.",
    names: [
      "Minimalist Watch", "Automatic Field Watch", "Heritage Chronograph", "Slim Dress Watch",
      "Titanium Sport Watch", "Ceramic Bezel Diver", "Moonphase Leather Watch", "Rose Gold Mesh Watch",
      "Open Heart Automatic", "Pilot GMT Watch", "Solar Everyday Watch", "Square Case Classic",
      "Sapphire Minimal Watch", "Travel Dual-Time Watch", "Skeleton Dial Watch", "Vintage Tank Watch",
      "Rubber Strap Diver", "Brushed Steel Chrono", "Midnight Black Watch", "Pearl Dial Watch",
    ],
  },
  {
    name: "Footwear",
    slug: "footwear",
    description: "Sneakers, loafers, sandals, boots, and refined everyday footwear.",
    names: [
      "Premium Sneakers", "Leather City Loafers", "Suede Chelsea Boots", "Runner Knit Trainers",
      "Minimal Court Sneakers", "Trail Grip Shoes", "Cushioned Slides", "Oxford Dress Shoes",
      "Platform Canvas Sneakers", "Nubuck Desert Boots", "Penny Loafers", "Waterproof Hiker Boots",
      "Memory Foam Walkers", "Woven Summer Sandals", "High-Top Street Shoes", "Leather Mule Flats",
      "Carbon Sole Runners", "Monk Strap Shoes", "Quilted Ballet Flats", "Everyday Slip-On Sneakers",
    ],
  },
  {
    name: "Kitchen",
    slug: "kitchen",
    description: "Cookware, prep tools, serving pieces, coffee gear, and kitchen storage.",
    names: [
      "Cast Iron Skillet", "Chef Knife Classic", "Stoneware Mixing Bowls", "Pour Over Coffee Kit",
      "Airtight Pantry Jars", "Enamel Dutch Oven", "Bamboo Cutting Board", "Stainless Measuring Set",
      "Ceramic Nonstick Pan", "Glass Spice Rack", "Manual Espresso Grinder", "Silicone Utensil Set",
      "Marble Rolling Pin", "Copper Saucepan", "Linen Apron Set", "Stackable Lunch Boxes",
      "Acacia Serving Board", "Digital Kitchen Scale", "French Press Carafe", "Minimal Dish Rack",
    ],
  },
  {
    name: "Travel",
    slug: "travel",
    description: "Luggage, organizers, carry-on essentials, outdoor travel, and commute gear.",
    names: [
      "Cabin Spinner Suitcase", "Weekender Duffel Bag", "Packing Cube Set", "RFID Travel Wallet",
      "Compact Toiletry Kit", "Travel Neck Pillow", "Waterproof Daypack", "Hard Shell Check-In Case",
      "Passport Organizer", "Garment Travel Sleeve", "Collapsible Water Bottle", "Tech Cable Organizer",
      "Compression Travel Bags", "Luggage Scale Mini", "Noise Sleep Mask", "Adventure Sling Pack",
      "Laptop Travel Backpack", "Vacuum Flask Traveller", "Shoe Travel Pouches", "Folding Picnic Blanket",
    ],
  },
  {
    name: "Gaming",
    slug: "gaming",
    description: "Gaming peripherals, streaming gear, desk upgrades, and console accessories.",
    names: [
      "RGB Gaming Mouse", "Tactile Gaming Keyboard", "Wireless Game Controller", "Streaming Webcam Pro",
      "Noise Cancel Gaming Headset", "XL Desk Mat", "Console Charging Dock", "Programmable Macro Pad",
      "Ergonomic Gaming Chair", "LED Monitor Light Bar", "Dual Controller Stand", "Portable Capture Card",
      "Low-Latency Earbuds", "Adjustable Mic Arm", "Cooling Laptop Stand", "Arcade Fight Stick",
      "Thumb Grip Kit", "Gaming Backpack", "4K HDMI Switch", "Immersive Speaker Bar",
    ],
  },
];

function priceFor(categoryIndex, productIndex) {
  const base = [2499, 3299, 2199, 1599, 899, 699, 4999, 2799, 1899, 3599, 2299][categoryIndex] || 1499;
  const price = base + productIndex * 375 + (productIndex % 4) * 120;
  return Number(price.toFixed(2));
}

function tagsFor(category, name) {
  const words = name.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter(Boolean);
  return [...new Set([category.slug, category.name.toLowerCase(), ...words.slice(0, 3), "premium"])];
}

function descriptionFor(category, name, index) {
  const qualities = [
    "crafted for everyday reliability with a refined finish",
    "selected for its balance of performance, comfort, and quiet luxury",
    "designed to feel considered, durable, and easy to use from day one",
    "built with thoughtful materials and a polished, gift-ready presentation",
  ];
  return `${name} is a premium ${category.name.toLowerCase()} pick ${qualities[index % qualities.length]}. It fits naturally into the Shumara catalog with strong usability, modern styling, dependable quality, and details that make it suitable for repeat daily use.`;
}

async function seed() {
  await connectDB();
  let categoryCount = 0;
  let productCount = 0;

  for (const [categoryIndex, category] of categories.entries()) {
    const images = imageSets[category.slug];
    const categoryDoc = await Category.findOneAndUpdate(
      { slug: category.slug },
      {
        name: category.name,
        slug: category.slug,
        description: category.description,
        image_url: images[0],
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    categoryCount += 1;

    for (const [index, name] of category.names.entries()) {
      const price = priceFor(categoryIndex, index);
      const image_url = images[index % images.length];
      await Product.findOneAndUpdate(
        { name, category_id: categoryDoc._id },
        {
          name,
          description: descriptionFor(category, name, index),
          price,
          original_price: Number((price * (1.18 + (index % 5) * 0.03)).toFixed(2)),
          category_id: categoryDoc._id,
          image_url,
          images: [image_url, images[(index + 1) % images.length]],
          stock: 24 + ((index * 7) % 90),
          rating: Number((4.2 + (index % 8) * 0.08).toFixed(1)),
          review_count: 18 + index * 13,
          tags: tagsFor(category, name),
          is_featured: index < 4,
          is_active: true,
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      productCount += 1;
    }
  }

  console.log(`Seeded ${categoryCount} categories and ${productCount} products.`);
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
