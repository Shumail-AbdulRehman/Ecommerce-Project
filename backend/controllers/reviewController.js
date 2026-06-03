const { Product, Review, Order, objectId, clean } = require("../models");

async function updateProductRating(productId) {
  const stats = await Review.aggregate([
    { $match: { product_id: productId } },
    { $group: { _id: "$product_id", rating: { $avg: "$rating" }, review_count: { $sum: 1 } } },
  ]);

  await Product.findByIdAndUpdate(productId, {
    rating: stats[0]?.rating || 0,
    review_count: stats[0]?.review_count || 0,
  });
}

function reviewPayload(review) {
  const data = clean(review);
  const user = review.user_id && typeof review.user_id === "object" ? clean(review.user_id) : null;
  return {
    ...data,
    user_id: user ? user.id : data.user_id?.toString?.() || data.user_id,
    product_id: data.product_id?.toString?.() || data.product_id,
    user_name: user?.name,
    avatar: user?.avatar,
  };
}

exports.getProductReviews = async (req, res) => {
  try {
    const productId = objectId(req.params.id);
    if (!productId) return res.status(404).json({ message: "Product not found" });

    const reviews = await Review.find({ product_id: productId })
      .populate("user_id")
      .sort({ created_at: -1 });

    const ratingMap = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      ratingMap[review.rating] = (ratingMap[review.rating] || 0) + 1;
    });

    res.json({ reviews: reviews.map(reviewPayload), breakdown: ratingMap });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.addReview = async (req, res) => {
  try {
    const productId = objectId(req.params.id);
    const userId = objectId(req.user.id);
    const { rating, comment } = req.body;
    if (!productId || !userId) return res.status(400).json({ message: "Invalid request" });

    const product = await Product.findOne({ _id: productId, is_active: true });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const existing = await Review.findOne({ user_id: userId, product_id: productId });
    if (existing) return res.status(409).json({ message: "You have already reviewed this product" });

    const purchased = await Order.exists({
      user_id: userId,
      status: { $ne: "cancelled" },
      "items.product_id": productId,
    });
    if (!purchased) {
      return res.status(403).json({ message: "You can only review products you have purchased" });
    }

    await Review.create({ user_id: userId, product_id: productId, rating, comment: comment || null });
    await updateProductRating(productId);

    res.status(201).json({ message: "Review added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const reviewId = objectId(req.params.reviewId);
    const userId = objectId(req.user.id);
    const { rating, comment } = req.body;
    if (!reviewId || !userId) return res.status(400).json({ message: "Invalid request" });

    const review = await Review.findOne({ _id: reviewId, user_id: userId });
    if (!review) return res.status(404).json({ message: "Review not found" });

    review.rating = rating;
    review.comment = comment || null;
    await review.save();
    await updateProductRating(review.product_id);

    res.json({ message: "Review updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const reviewId = objectId(req.params.reviewId);
    const userId = objectId(req.user.id);
    if (!reviewId || !userId) return res.status(400).json({ message: "Invalid request" });

    const query = req.user.role === "admin"
      ? { _id: reviewId }
      : { _id: reviewId, user_id: userId };

    const review = await Review.findOne(query);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const productId = review.product_id;
    await review.deleteOne();
    await updateProductRating(productId);

    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.checkCanReview = async (req, res) => {
  try {
    const productId = objectId(req.params.id);
    const userId = objectId(req.user.id);
    if (!productId || !userId) return res.status(400).json({ message: "Invalid request" });

    const [purchased, reviewed] = await Promise.all([
      Order.exists({ user_id: userId, status: { $ne: "cancelled" }, "items.product_id": productId }),
      Review.exists({ user_id: userId, product_id: productId }),
    ]);

    res.json({
      canReview: Boolean(purchased && !reviewed),
      hasPurchased: Boolean(purchased),
      hasReviewed: Boolean(reviewed),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
