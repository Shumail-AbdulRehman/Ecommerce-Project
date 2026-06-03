const { CartItem, Product, objectId } = require("../models");

function cartPayload(item) {
  const product = item.product_id;
  return {
    id: item.id,
    quantity: item.quantity,
    product_id: product.id,
    name: product.name,
    price: product.price,
    original_price: product.original_price,
    image_url: product.image_url,
    stock: product.stock,
  };
}

exports.getCart = async (req, res) => {
  try {
    const items = await CartItem.find({ user_id: req.user.id }).populate("product_id").sort({ created_at: -1 });
    const activeItems = items.filter((item) => item.product_id && item.product_id.is_active);
    const payload = activeItems.map(cartPayload);
    const total = payload.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.json({ items: payload, total: parseFloat(total.toFixed(2)), count: payload.length });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { quantity = 1 } = req.body;
    const productId = objectId(req.body.product_id);
    if (!productId) return res.status(400).json({ message: "Invalid product ID" });

    const product = await Product.findOne({ _id: productId, is_active: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.stock < quantity) return res.status(400).json({ message: "Insufficient stock" });

    const existing = await CartItem.findOne({ user_id: req.user.id, product_id: productId });
    if (existing) {
      const nextQty = existing.quantity + Number(quantity);
      if (nextQty > product.stock) return res.status(400).json({ message: "Insufficient stock" });
      existing.quantity = nextQty;
      await existing.save();
    } else {
      await CartItem.create({ user_id: req.user.id, product_id: productId, quantity });
    }

    res.json({ message: "Added to cart" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Item not found" });

    const { quantity } = req.body;
    if (quantity <= 0) {
      await CartItem.deleteOne({ _id: id, user_id: req.user.id });
      return res.json({ message: "Item removed" });
    }

    const item = await CartItem.findOne({ _id: id, user_id: req.user.id }).populate("product_id");
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (!item.product_id || item.product_id.stock < quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    item.quantity = quantity;
    await item.save();
    res.json({ message: "Cart updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Item not found" });
    await CartItem.deleteOne({ _id: id, user_id: req.user.id });
    res.json({ message: "Item removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.clearCart = async (req, res) => {
  try {
    await CartItem.deleteMany({ user_id: req.user.id });
    res.json({ message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
