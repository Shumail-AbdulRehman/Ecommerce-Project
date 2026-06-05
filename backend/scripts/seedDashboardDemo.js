require("dotenv").config();
const { connectDB, mongoose } = require("../config/db");
const { User, Product, Order } = require("../models");

const DEMO_NOTE = "Shumara dashboard demo order";

const demoCustomers = [
  ["Ayesha Khan", "ayesha.demo@shumara.test", "Lahore", "Punjab"],
  ["Hamza Malik", "hamza.demo@shumara.test", "Karachi", "Sindh"],
  ["Sara Ahmed", "sara.demo@shumara.test", "Islamabad", "Islamabad Capital Territory"],
  ["Bilal Raza", "bilal.demo@shumara.test", "Rawalpindi", "Punjab"],
  ["Mariam Noor", "mariam.demo@shumara.test", "Faisalabad", "Punjab"],
  ["Usman Tariq", "usman.demo@shumara.test", "Multan", "Punjab"],
  ["Hira Shah", "hira.demo@shumara.test", "Hyderabad", "Sindh"],
  ["Danish Ali", "danish.demo@shumara.test", "Peshawar", "Khyber Pakhtunkhwa"],
];

const statuses = ["pending", "dispatched", "out_for_delivery", "delivered", "cancelled"];
const paymentStatuses = ["paid", "paid", "paid", "pending", "refunded"];

function dayOffset(daysAgo, hour = 12) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 15, 0, 0);
  return date;
}

function shippingFor(customer, index) {
  return {
    name: customer.name,
    phone: `03${String(10 + index).padStart(2, "0")}1234567`,
    address: `House ${index + 11}, Block ${String.fromCharCode(65 + (index % 5))}`,
    city: customer.city,
    state: customer.state,
    zip: String(54000 + index * 111).slice(0, 5),
    country: "Pakistan",
  };
}

async function seedCustomers() {
  const customers = [];
  for (const [index, [name, email, city, state]] of demoCustomers.entries()) {
    const user = await User.findOneAndUpdate(
      { email },
      {
        name,
        email,
        role: "user",
        is_verified: true,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    customers.push({ ...user.toObject(), city, state, demoIndex: index });
  }
  return customers;
}

async function setLowStockProducts(products) {
  const lowStockLevels = [0, 2, 4, 6, 8, 10, 1, 3, 5, 7, 9, 10];
  const targets = products.slice(0, lowStockLevels.length);

  await Promise.all(targets.map((product, index) => Product.findByIdAndUpdate(product._id, {
    stock: lowStockLevels[index],
    is_active: true,
  })));

  return targets.length;
}

function buildOrder(customer, products, index) {
  const status = statuses[index % statuses.length];
  const productA = products[index % products.length];
  const productB = products[(index * 3 + 5) % products.length];
  const quantityA = (index % 3) + 1;
  const quantityB = (index % 2) + 1;
  const items = [
    {
      product_id: productA._id,
      quantity: quantityA,
      price: productA.price,
      product_name: productA.name,
      product_image: productA.image_url,
    },
    {
      product_id: productB._id,
      quantity: quantityB,
      price: productB.price,
      product_name: productB.name,
      product_image: productB.image_url,
    },
  ];
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Number((subtotal + (subtotal >= 999 ? 0 : 49)).toFixed(2));
  const createdAt = dayOffset(index % 7, 9 + (index % 9));

  return {
    user_id: customer._id,
    items,
    total_amount: total,
    status,
    payment_status: paymentStatuses[index % paymentStatuses.length],
    payment_method: "cash_on_delivery",
    shipping_address: shippingFor(customer, index),
    emails_sent: [],
    cancel_reason: status === "cancelled" ? "Demo cancellation for dashboard testing" : null,
    cancelled_at: status === "cancelled" ? createdAt : null,
    notes: DEMO_NOTE,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

async function seed() {
  await connectDB();

  const products = await Product.find({ is_active: true }).sort({ created_at: 1 }).limit(60);
  if (products.length < 10) throw new Error("Seed catalog products first before dashboard demo data.");

  const [customers, lowStockCount] = await Promise.all([
    seedCustomers(),
    setLowStockProducts(products),
  ]);

  await Order.deleteMany({ notes: DEMO_NOTE });

  const orders = Array.from({ length: 28 }, (_, index) => (
    buildOrder(customers[index % customers.length], products, index)
  ));
  await Order.insertMany(orders);

  console.log(`Seeded ${orders.length} demo dashboard orders.`);
  console.log(`Updated ${lowStockCount} products with real low stock values.`);
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
