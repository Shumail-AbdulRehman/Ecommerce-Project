const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { Address, objectId, clean } = require("../models");

router.get("/", authenticate, async (req, res) => {
  try {
    const result = await Address.find({ user_id: req.user.id }).sort({ is_default: -1, created_at: -1 });
    res.json(result.map(clean));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const { name, phone, flat, area, landmark = "", city, state, zip, country = "Pakistan", is_default = false } = req.body;
    if (!name || !phone || !flat || !area || !city || !state || !zip) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    if (is_default) await Address.updateMany({ user_id: req.user.id }, { is_default: false });

    const count = await Address.countDocuments({ user_id: req.user.id });
    const address = await Address.create({
      user_id: req.user.id,
      name,
      phone,
      flat,
      area,
      landmark,
      city,
      state,
      zip,
      country,
      is_default: Boolean(is_default || count === 0),
    });

    res.status(201).json(clean(address));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add address" });
  }
});

router.put("/:id", authenticate, async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Address not found" });

    const { name, phone, flat, area, landmark = "", city, state, zip, country = "Pakistan", is_default = false } = req.body;
    if (is_default) await Address.updateMany({ user_id: req.user.id }, { is_default: false });

    const address = await Address.findOneAndUpdate(
      { _id: id, user_id: req.user.id },
      { name, phone, flat, area, landmark, city, state, zip, country, is_default },
      { returnDocument: "after" }
    );

    if (!address) return res.status(404).json({ message: "Address not found" });
    res.json(clean(address));
  } catch (err) {
    res.status(500).json({ message: "Failed to update address" });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Address not found" });
    await Address.deleteOne({ _id: id, user_id: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete address" });
  }
});

router.patch("/:id/default", authenticate, async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Address not found" });
    await Address.updateMany({ user_id: req.user.id }, { is_default: false });
    await Address.updateOne({ _id: id, user_id: req.user.id }, { is_default: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to set default" });
  }
});

module.exports = router;
