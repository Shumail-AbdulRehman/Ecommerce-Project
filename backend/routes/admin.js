const express = require("express");
const router = express.Router();
const { authenticate, isAdmin } = require("../middleware/auth");
const { User, Order, objectId, clean } = require("../models");

function customerPayload(user, stats = {}) {
  const data = clean(user);
  delete data.password;
  return {
    ...data,
    order_count: stats.order_count || 0,
    total_spent: stats.total_spent || 0,
    last_order_at: stats.last_order_at || null,
  };
}

router.get("/customers", authenticate, isAdmin, async (_req, res) => {
  try {
    const [users, orderStats] = await Promise.all([
      User.find().select("name email role avatar is_verified created_at updated_at").sort({ created_at: -1 }).lean(),
      Order.aggregate([
        {
          $group: {
            _id: "$user_id",
            order_count: { $sum: 1 },
            total_spent: { $sum: "$total_amount" },
            last_order_at: { $max: "$created_at" },
          },
        },
      ]),
    ]);

    const statsByUser = new Map(orderStats.map((stat) => [stat._id.toString(), stat]));
    res.json(users.map((user) => customerPayload(user, statsByUser.get(user.id))));
  } catch (err) {
    console.error("[Admin] Customers error:", err.message);
    res.status(500).json({ message: "Failed to fetch customers" });
  }
});

router.put("/customers/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Customer not found" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "Customer not found" });

    const { name, role, is_verified, avatar } = req.body;
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ message: "Name is required" });
      user.name = String(name).trim();
    }
    if (avatar !== undefined) user.avatar = String(avatar || "").trim() || null;
    if (is_verified !== undefined) user.is_verified = Boolean(is_verified);
    if (role !== undefined) {
      if (!["user", "admin"].includes(role)) return res.status(400).json({ message: "Invalid role" });
      if (req.user.id === user.id && role !== "admin") {
        return res.status(400).json({ message: "You cannot remove your own admin access" });
      }
      user.role = role;
    }

    await user.save();
    res.json({ message: "Customer updated", customer: customerPayload(user) });
  } catch (err) {
    console.error("[Admin] Update customer error:", err.message);
    res.status(500).json({ message: "Failed to update customer" });
  }
});

router.delete("/customers/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Customer not found" });
    if (req.user.id === id.toString()) {
      return res.status(400).json({ message: "You cannot delete your own admin account" });
    }

    const orderCount = await Order.countDocuments({ user_id: id });
    if (orderCount > 0) {
      return res.status(409).json({
        message: "This customer has orders. Keep the account for order history or change its role instead.",
        orderCount,
      });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "Customer not found" });

    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error("[Admin] Delete customer error:", err.message);
    res.status(500).json({ message: "Failed to delete customer" });
  }
});

module.exports = router;
