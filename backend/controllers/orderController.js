const { mongoose, objectId, Product, CartItem, Order, User, Category, productPayload, orderPayload } = require("../models");
const { sendOrderStatusEmail } = require("../utils/sendOrderEmail");
const { createNotification } = require("../utils/notificationHelper");

const STATUS_NOTIFICATIONS = {
  pending: { title: "Order Placed!", message: (id) => `Your order #${id} has been placed successfully.` },
  dispatched: { title: "Order Dispatched", message: (id) => `Your order #${id} has been dispatched and is on its way.` },
  out_for_delivery: { title: "Out for Delivery", message: (id) => `Your order #${id} is out for delivery. Expect it today!` },
  delivered: { title: "Order Delivered", message: (id) => `Your order #${id} has been delivered. Enjoy your purchase!` },
  cancelled: { title: "Order Cancelled", message: (id) => `Your order #${id} has been cancelled.` },
};

const ORDER_STATUSES = Object.keys(STATUS_NOTIFICATIONS);
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];
const USER_POPULATE = { path: "user_id", select: "name email", options: { lean: true } };

function checkoutTotal(subtotal) {
  const shipping = subtotal >= 999 ? 0 : 49;
  return Number((subtotal + shipping).toFixed(2));
}

async function getFullOrder(orderId) {
  const id = objectId(orderId);
  if (!id) return null;
  const order = await Order.findById(id).populate(USER_POPULATE).lean();
  return order ? orderPayload(order) : null;
}

async function buildItemsFromProducts(rawItems, session) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("No order items");
  }

  const quantities = new Map();
  for (const item of rawItems) {
    const productId = objectId(item.product_id || item.id);
    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    if (!productId) throw new Error("Invalid product in order");
    const key = productId.toString();
    quantities.set(key, (quantities.get(key) || 0) + quantity);
  }

  const products = await Product.find({
    _id: { $in: [...quantities.keys()] },
    is_active: true,
  }).session(session);

  if (products.length !== quantities.size) {
    throw new Error("One or more products are unavailable");
  }

  const items = [];
  let subtotal = 0;
  for (const product of products) {
    const quantity = quantities.get(product.id);
    if (product.stock < quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    items.push({
      product_id: product._id,
      quantity,
      price: product.price,
      product_name: product.name,
      product_image: product.image_url,
    });
    subtotal += product.price * quantity;
  }

  return { items, subtotal: Number(subtotal.toFixed(2)), total: checkoutTotal(subtotal) };
}

async function decrementStock(items, session) {
  for (const item of items) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.product_id, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { returnDocument: "after", session }
    );
    if (!updated) throw new Error(`Insufficient stock for ${item.product_name}`);
  }
}

async function notifyOrderStatus(orderId, status) {
  const fullOrder = await getFullOrder(orderId);
  if (!fullOrder) return;

  if (!fullOrder.emailsSent.includes(status)) {
    sendOrderStatusEmail(fullOrder, status)
      .then(async (result) => {
        if (result) {
          await Order.findByIdAndUpdate(orderId, { $addToSet: { emails_sent: status } });
        }
      })
      .catch(console.error);
  }

  const notif = STATUS_NOTIFICATIONS[status];
  if (notif) {
    await createNotification(fullOrder.user_id, {
      type: "order",
      title: notif.title,
      message: notif.message(fullOrder.id),
      link: "/orders",
    });
  }
}

exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const { items, shippingAddress } = req.body;
      const built = await buildItemsFromProducts(items, session);
      await decrementStock(built.items, session);

      [order] = await Order.create([{
        user_id: req.user.id,
        items: built.items,
        total_amount: built.total,
        payment_method: "cash_on_delivery",
        payment_status: "pending",
        status: "pending",
        emails_sent: [],
        shipping_address: shippingAddress || {},
      }], { session });

      await CartItem.deleteMany({ user_id: req.user.id }).session(session);
    });

    const fullOrder = await getFullOrder(order.id);
    if (fullOrder) {
      sendOrderStatusEmail(fullOrder, "pending").catch(console.error);
      await createNotification(req.user.id, {
        type: "order",
        title: STATUS_NOTIFICATIONS.pending.title,
        message: STATUS_NOTIFICATIONS.pending.message(order.id),
        link: "/orders",
      });
    }
    res.status(201).json({ message: "Order placed successfully", orderId: order.id });
  } catch (err) {
    console.error("[Orders] Create error:", err.message);
    res.status(400).json({ message: err.message || "Failed to create order" });
  } finally {
    session.endSession();
  }
};

exports.createAdminOrder = async (req, res) => {
  const session = await mongoose.startSession();
  let order;
  try {
    const {
      user_id,
      items,
      shippingAddress,
      shipping_address,
      payment_status = "pending",
      status = "pending",
      notes = "",
    } = req.body;
    const customerId = objectId(user_id);

    if (!customerId) return res.status(400).json({ message: "Customer is required" });
    if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid order status" });
    if (!PAYMENT_STATUSES.includes(payment_status)) return res.status(400).json({ message: "Invalid payment status" });

    const customer = await User.findById(customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    await session.withTransaction(async () => {
      const built = await buildItemsFromProducts(items, session);
      await decrementStock(built.items, session);

      [order] = await Order.create([{
        user_id: customerId,
        items: built.items,
        total_amount: built.total,
        payment_method: "cash_on_delivery",
        payment_status,
        status,
        notes: String(notes || "").trim(),
        cancelled_at: status === "cancelled" ? new Date() : null,
        shipping_address: shipping_address || shippingAddress || {},
      }], { session });
    });

    await notifyOrderStatus(order.id, order.status);
    const saved = await Order.findById(order.id).populate(USER_POPULATE).lean();
    res.status(201).json({ message: "Order created", order: orderPayload(saved) });
  } catch (err) {
    console.error("[Orders] Admin create error:", err.message);
    res.status(400).json({ message: err.message || "Failed to create order" });
  } finally {
    session.endSession();
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const id = objectId(req.params.id);
    const { status } = req.body;
    if (!id) return res.status(404).json({ message: "Order not found" });
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const statusChanged = order.status !== status;
    order.status = status;
    if (status === "cancelled") {
      order.cancelled_at = order.cancelled_at || new Date();
    } else {
      order.cancelled_at = null;
      order.cancel_reason = null;
    }
    await order.save();

    if (statusChanged) await notifyOrderStatus(id, status);

    res.json({ message: "Order status updated", status });
  } catch (err) {
    console.error("[Orders] Status update error:", err.message);
    res.status(500).json({ message: "Failed to update status" });
  }
};

exports.updateOrderAdmin = async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Order not found" });

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const previousStatus = order.status;
    const {
      status,
      payment_status,
      payment_method,
      shipping_address,
      notes,
      cancel_reason,
      total_amount,
    } = req.body;

    if (status !== undefined) {
      if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid order status" });
      order.status = status;
      if (status === "cancelled" && !order.cancelled_at) order.cancelled_at = new Date();
      if (status !== "cancelled") {
        order.cancelled_at = null;
        order.cancel_reason = null;
      }
    }

    if (payment_status !== undefined) {
      if (!PAYMENT_STATUSES.includes(payment_status)) {
        return res.status(400).json({ message: "Invalid payment status" });
      }
      order.payment_status = payment_status;
    }

    if (payment_method !== undefined) order.payment_method = "cash_on_delivery";
    if (shipping_address !== undefined) {
      if (!shipping_address || typeof shipping_address !== "object" || Array.isArray(shipping_address)) {
        return res.status(400).json({ message: "Shipping address must be an object" });
      }
      order.shipping_address = shipping_address;
    }
    if (notes !== undefined) order.notes = String(notes || "").trim();
    if (cancel_reason !== undefined) {
      order.cancel_reason = order.status === "cancelled" ? String(cancel_reason || "").trim() || null : null;
    }
    if (total_amount !== undefined) {
      const parsedTotal = Number(total_amount);
      if (!Number.isFinite(parsedTotal) || parsedTotal < 0) {
        return res.status(400).json({ message: "Order total must be a non-negative number" });
      }
      order.total_amount = parsedTotal;
    }

    await order.save();

    if (previousStatus !== order.status) await notifyOrderStatus(id, order.status);

    const saved = await Order.findById(id).populate(USER_POPULATE).lean();
    res.json({ message: "Order updated", order: orderPayload(saved) });
  } catch (err) {
    console.error("[Orders] Admin update error:", err.message);
    res.status(500).json({ message: "Failed to update order" });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Order not found" });

    const order = await Order.findByIdAndDelete(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({ message: "Order deleted" });
  } catch (err) {
    console.error("[Orders] Delete error:", err.message);
    res.status(500).json({ message: "Failed to delete order" });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const id = objectId(req.params.id);
    const userId = objectId(req.user.id);
    const { reason = "No reason provided" } = req.body;
    if (!id || !userId) return res.status(404).json({ message: "Order not found" });

    const order = await Order.findOne({ _id: id, user_id: userId });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!["pending", "dispatched"].includes(order.status)) {
      return res.status(400).json({ message: "Order cannot be cancelled at this stage" });
    }

    order.status = "cancelled";
    order.cancelled_at = new Date();
    order.cancel_reason = reason;
    await order.save();

    const fullOrder = await getFullOrder(id);
    if (fullOrder) {
      sendOrderStatusEmail(fullOrder, "cancelled").catch(console.error);
      await createNotification(req.user.id, {
        type: "order",
        title: STATUS_NOTIFICATIONS.cancelled.title,
        message: `Your order #${order.id} has been cancelled. Reason: ${reason}`,
        link: "/orders",
      });
    }

    res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    console.error("[Orders] Cancel error:", err.message);
    res.status(500).json({ message: "Failed to cancel order" });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id }).sort({ created_at: -1 }).lean();
    res.json(orders.map(orderPayload));
  } catch (err) {
    console.error("[Orders] My orders error:", err.message);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await getFullOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (req.user.role !== "admin" && order.user_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    res.json(order);
  } catch (err) {
    console.error("[Orders] Get by ID error:", err.message);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const limit = Math.max(0, Math.min(500, parseInt(req.query.limit, 10) || 0));
    const query = Order.find().populate(USER_POPULATE).sort({ created_at: -1 }).lean();
    if (limit > 0) query.limit(limit);
    const orders = await query;
    res.json(orders.map(orderPayload));
  } catch (err) {
    console.error("[Orders] Get all error:", err.message);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

exports.getAdminStats = async (_req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [orderStats, total_products, total_categories, total_users, recentOrders, lowStockProducts] = await Promise.all([
      Order.aggregate([
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  total_orders: { $sum: 1 },
                  total_revenue: { $sum: "$total_amount" },
                },
              },
            ],
            dailyRevenue: [
              { $match: { created_at: { $gte: sevenDaysAgo } } },
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                  revenue: { $sum: "$total_amount" },
                  orders: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],
            statusCounts: [
              { $group: { _id: "$status", count: { $sum: 1 } } },
            ],
          },
        },
      ]),
      Product.countDocuments(),
      Category.countDocuments(),
      User.countDocuments(),
      Order.find().populate(USER_POPULATE).sort({ created_at: -1 }).limit(5).lean(),
      Product.find({ is_active: true, stock: { $lte: 10 } })
        .select("name price stock image_url category_id rating review_count is_featured created_at")
        .populate({ path: "category_id", select: "name slug", options: { lean: true } })
        .sort({ stock: 1, created_at: -1 })
        .limit(6)
        .lean(),
    ]);
    const stats = orderStats[0] || {};
    const totals = stats.totals?.[0] || {};
    const statusCounts = (stats.statusCounts || []).reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.json({
      total_orders: totals.total_orders || 0,
      total_revenue: totals.total_revenue || 0,
      total_products,
      total_categories,
      total_users,
      statusCounts,
      lowStockProducts: lowStockProducts.map(productPayload),
      recentOrders: recentOrders.map(orderPayload),
      dailyRevenue: (stats.dailyRevenue || []).map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders })),
    });
  } catch (err) {
    console.error("[Orders] Stats error:", err.message);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

exports.getTopProducts = async (_req, res) => {
  try {
    const result = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product_id",
          product_name: { $first: "$items.product_name" },
          total_sold: { $sum: "$items.quantity" },
          total_revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        },
      },
      { $sort: { total_sold: -1 } },
      { $limit: 5 },
    ]);
    res.json(result);
  } catch (err) {
    console.error("[Orders] Top products error:", err.message);
    res.status(500).json({ message: "Failed to fetch top products" });
  }
};

exports.checkoutTotal = checkoutTotal;
exports.buildItemsFromProducts = buildItemsFromProducts;
exports.decrementStock = decrementStock;
exports.getFullOrder = getFullOrder;
