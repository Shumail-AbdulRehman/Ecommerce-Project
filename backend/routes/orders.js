const express = require("express");
const router = express.Router();
const {
  createOrder,
  createAdminOrder,
  updateOrderStatus,
  getAllOrders,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAdminStats,
  getTopProducts,
  updateOrderAdmin,
  deleteOrder,
} = require("../controllers/orderController");

const { authenticate, isAdmin } = require("../middleware/auth");

router.get("/admin/stats", authenticate, isAdmin, getAdminStats);
router.get("/admin/all", authenticate, isAdmin, getAllOrders);
router.get("/admin/top-products", authenticate, isAdmin, getTopProducts);
router.post("/admin", authenticate, isAdmin, createAdminOrder);

router.post("/", authenticate, createOrder);
router.get("/mine", authenticate, getMyOrders);

router.get("/", authenticate, isAdmin, getAllOrders);
router.put("/:id/status", authenticate, isAdmin, updateOrderStatus);
router.put("/:id", authenticate, isAdmin, updateOrderAdmin);
router.delete("/:id", authenticate, isAdmin, deleteOrder);

router.get("/:id", authenticate, getOrderById);
router.put("/:id/cancel", authenticate, cancelOrder);

module.exports = router;
