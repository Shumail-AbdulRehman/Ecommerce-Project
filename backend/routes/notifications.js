const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { Notification, objectId, clean } = require("../models");

router.get("/", authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .limit(50);
    const payload = notifications.map(clean);
    const unread = payload.filter((n) => !n.is_read).length;
    res.json({ notifications: payload, unread });
  } catch (err) {
    console.error("[Notifications] Fetch error:", err.message);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.patch("/read-all", authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ user_id: req.user.id }, { is_read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark all as read" });
  }
});

router.patch("/:id/read", authenticate, async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Notification not found" });
    await Notification.updateOne({ _id: id, user_id: req.user.id }, { is_read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark as read" });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Notification not found" });
    await Notification.deleteOne({ _id: id, user_id: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete notification" });
  }
});

module.exports = router;
