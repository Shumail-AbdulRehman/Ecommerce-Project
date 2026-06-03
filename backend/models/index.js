const { mongoose } = require("../config/db");

const { Schema } = mongoose;

const objectId = (value) => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
};

const baseOptions = {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret.__v;
      return ret;
    },
  },
  toObject: { virtuals: true },
};

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: null },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    avatar: { type: String, default: null },
    is_verified: { type: Boolean, default: false },
  },
  baseOptions
);

const otpVerificationSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otp: { type: String, required: true },
    type: { type: String, enum: ["register", "reset_password"], required: true },
    expires_at: { type: Date, required: true, index: true },
    is_used: { type: Boolean, default: false },
  },
  baseOptions
);

otpVerificationSchema.index({ email: 1, type: 1, created_at: -1 });

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    image_url: { type: String, default: "" },
  },
  baseOptions
);

categorySchema.index({ name: 1 });

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    original_price: { type: Number, default: null },
    category_id: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    image_url: { type: String, default: "" },
    images: [{ type: String }],
    stock: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    review_count: { type: Number, default: 0, min: 0 },
    tags: [{ type: String }],
    is_featured: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
  },
  baseOptions
);

productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ name: 1, category_id: 1 }, { unique: true });
productSchema.index({ is_active: 1, category_id: 1, is_featured: -1, created_at: -1 });
productSchema.index({ is_active: 1, is_featured: -1, rating: -1, review_count: -1 });
productSchema.index({ is_active: 1, stock: 1 });

const cartItemSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  baseOptions
);

cartItemSchema.index({ user_id: 1, product_id: 1 }, { unique: true });

const orderItemSchema = new Schema(
  {
    product_id: { type: Schema.Types.ObjectId, ref: "Product" },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    product_name: { type: String, required: true },
    product_image: { type: String, default: "" },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [orderItemSchema],
    total_amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "dispatched", "out_for_delivery", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    shipping_address: { type: Schema.Types.Mixed, required: true },
    payment_method: { type: String, default: "cash_on_delivery" },
    payment_status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    emails_sent: [{ type: String }],
    cancel_reason: { type: String, default: null },
    cancelled_at: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  baseOptions
);

orderSchema.index({ created_at: -1 });
orderSchema.index({ user_id: 1, created_at: -1 });
orderSchema.index({ status: 1, created_at: -1 });
orderSchema.index({ "items.product_id": 1 });

const reviewSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: null },
  },
  baseOptions
);

reviewSchema.index({ user_id: 1, product_id: 1 }, { unique: true });

const addressSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    flat: { type: String, required: true },
    area: { type: String, required: true },
    landmark: { type: String, default: "" },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, default: "Pakistan" },
    is_default: { type: Boolean, default: false },
  },
  baseOptions
);

const notificationSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, default: "info" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: null },
    is_read: { type: Boolean, default: false },
  },
  baseOptions
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const OtpVerification = mongoose.models.OtpVerification || mongoose.model("OtpVerification", otpVerificationSchema);
const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
const CartItem = mongoose.models.CartItem || mongoose.model("CartItem", cartItemSchema);
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
const Address = mongoose.models.Address || mongoose.model("Address", addressSchema);
const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

function clean(doc) {
  if (!doc) return null;
  if (typeof doc.toJSON === "function") return doc.toJSON();
  const data = { ...doc };
  if (data._id && !data.id) data.id = data._id.toString();
  delete data.__v;
  return data;
}

function productPayload(product) {
  const data = clean(product);
  const category = product?.category_id && typeof product.category_id === "object" ? clean(product.category_id) : null;
  return {
    ...data,
    category_id: category ? category.id : data.category_id?.toString?.() || data.category_id,
    category_name: category?.name,
    category_slug: category?.slug,
  };
}

function orderPayload(order) {
  const data = clean(order);
  const user = order?.user_id && typeof order.user_id === "object" ? clean(order.user_id) : null;
  return {
    ...data,
    user_id: user ? user.id : data.user_id?.toString?.() || data.user_id,
    user_name: user?.name || data.user_name,
    user_email: user?.email || data.user_email,
    items: (data.items || []).map((item) => ({
      ...item,
      product_id: item.product_id?.toString?.() || item.product_id,
    })),
    shippingAddress: data.shipping_address || {},
    user: user ? { name: user.name, email: user.email } : data.user,
    totalPrice: data.total_amount,
    createdAt: data.created_at,
    emailsSent: data.emails_sent || [],
  };
}

module.exports = {
  mongoose,
  objectId,
  clean,
  productPayload,
  orderPayload,
  User,
  OtpVerification,
  Category,
  Product,
  CartItem,
  Order,
  Review,
  Address,
  Notification,
};
