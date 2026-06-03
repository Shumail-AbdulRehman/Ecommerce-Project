const { Notification } = require("../models");

async function createNotification(userId, { type = "info", title, message, link = null }) {
  try {
    await Notification.create({ user_id: userId, type, title, message, link });
  } catch (err) {
    console.error("[Notifications] Failed to create notification:", err.message);
  }
}

module.exports = { createNotification };
