const { Category, Product, objectId, clean, productPayload } = require("../models");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const HOME_CACHE_TTL_MS = 60 * 1000;
const productCache = new Map();
const PRODUCT_LIST_SELECT = "name description price original_price category_id image_url images stock rating review_count tags is_featured is_active created_at updated_at";
const CATEGORY_SELECT = "name slug description image_url created_at updated_at";
const CATEGORY_POPULATE = { path: "category_id", select: "name slug", options: { lean: true } };

function cacheGet(key) {
  const item = productCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    productCache.delete(key);
    return null;
  }
  return item.value;
}

function cacheSet(key, value) {
  productCache.set(key, { value, expiresAt: Date.now() + HOME_CACHE_TTL_MS });
}

function clearProductCache() {
  productCache.clear();
}

function cacheHomeResponse(res) {
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
}

function categoryPayload(category) {
  const data = clean(category) || {};
  return {
    ...data,
    id: data.id || data._id?.toString?.() || data._id,
  };
}

function productPayloadForCategory(product, category) {
  const data = productPayload(product);
  return {
    ...data,
    id: data.id || data._id?.toString?.() || data._id,
    category_id: category.id,
    category_name: category.name,
    category_slug: category.slug,
  };
}

function sortFor(value) {
  const sortMap = {
    "price-asc": { price: 1 },
    "price-desc": { price: -1 },
    rating: { rating: -1 },
    newest: { created_at: -1 },
    popular: { review_count: -1 },
  };
  return sortMap[value] || { is_featured: -1, created_at: -1 };
}

async function categoryIdFromInput(category_id) {
  if (!category_id) return null;
  if (objectId(category_id)) return objectId(category_id);
  const category = await Category.findOne({ slug: String(category_id).toLowerCase() }).select("_id").lean();
  return category?._id || null;
}

function slugify(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueCategorySlug(input, existingId = null) {
  const base = slugify(input) || `category-${Date.now()}`;
  let slug = base;
  let suffix = 2;

  while (await Category.findOne({
    slug,
    ...(existingId ? { _id: { $ne: existingId } } : {}),
  })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

exports.getProducts = async (req, res) => {
  try {
    const { category, search, sort, featured } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const query = { is_active: true };

    if (category) {
      const categoryDoc = await Category.findOne({ slug: category }).select("_id").lean();
      if (!categoryDoc) {
        return res.json({ products: [], pagination: { total: 0, page, limit, pages: 0 } });
      }
      query.category_id = categoryDoc._id;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [{ name: regex }, { description: regex }, { tags: regex }];
    }

    if (featured === "true") query.is_featured = true;

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .select(PRODUCT_LIST_SELECT)
        .populate(CATEGORY_POPULATE)
        .sort(sortFor(sort))
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      products: products.map(productPayload),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Product not found" });

    const product = await Product.findOne({ _id: id, is_active: true })
      .select(PRODUCT_LIST_SELECT)
      .populate(CATEGORY_POPULATE)
      .lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    const related = await Product.find({
      category_id: product.category_id?._id || product.category_id,
      _id: { $ne: product._id },
      is_active: true,
    })
      .select(PRODUCT_LIST_SELECT)
      .populate(CATEGORY_POPULATE)
      .sort({ rating: -1, review_count: -1 })
      .limit(4)
      .lean();

    res.json({ ...productPayload(product), related: related.map(productPayload) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      original_price,
      category_id,
      image_url,
      images,
      stock,
      tags,
      is_featured,
    } = req.body;

    const product = await Product.create({
      name,
      description,
      price: parseFloat(price),
      original_price: original_price ? parseFloat(original_price) : null,
      category_id: await categoryIdFromInput(category_id),
      image_url,
      images: Array.isArray(images) ? images : image_url ? [image_url] : [],
      stock: parseInt(stock, 10) || 0,
      tags: Array.isArray(tags) ? tags : [],
      is_featured: Boolean(is_featured),
    });

    clearProductCache();
    res.status(201).json({ message: "Product created", id: product.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Product not found" });

    const {
      name,
      description,
      price,
      original_price,
      category_id,
      image_url,
      images,
      stock,
      tags,
      is_featured,
      is_active,
    } = req.body;

    const update = {
      name,
      description,
      price: parseFloat(price),
      original_price: original_price ? parseFloat(original_price) : null,
      category_id: await categoryIdFromInput(category_id),
      image_url,
      images: Array.isArray(images) ? images : image_url ? [image_url] : [],
      stock: parseInt(stock, 10) || 0,
      tags: Array.isArray(tags) ? tags : [],
      is_featured: Boolean(is_featured),
      is_active: is_active !== false,
    };

    const product = await Product.findByIdAndUpdate(id, update, { returnDocument: "after" });
    if (!product) return res.status(404).json({ message: "Product not found" });

    clearProductCache();
    res.json({ message: "Product updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Product not found" });
    await Product.findByIdAndUpdate(id, { is_active: false });
    clearProductCache();
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCategories = async (_req, res) => {
  try {
    const cached = cacheGet("categories");
    if (cached) {
      cacheHomeResponse(res);
      return res.json(cached);
    }

    const [categories, counts] = await Promise.all([
      Category.find().select(CATEGORY_SELECT).sort({ name: 1 }).lean(),
      Product.aggregate([
        { $match: { is_active: true } },
        { $group: { _id: "$category_id", product_count: { $sum: 1 } } },
      ]),
    ]);
    const countByCategory = new Map(counts.map((item) => [item._id?.toString(), item.product_count]));
    const payload = categories.map((category) => ({
      ...categoryPayload(category),
      product_count: countByCategory.get(category._id.toString()) || 0,
    }));
    cacheSet("categories", payload);
    cacheHomeResponse(res);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description = "", image_url = "", slug } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const category = await Category.create({
      name: String(name).trim(),
      description: String(description || "").trim(),
      image_url: String(image_url || "").trim(),
      slug: await uniqueCategorySlug(slug || name),
    });

    clearProductCache();
    res.status(201).json({ message: "Category created", category: clean(category) });
  } catch (err) {
    console.error("[Products] Create category error:", err.message);
    res.status(500).json({ message: "Failed to create category", error: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Category not found" });

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const { name, description, image_url, slug } = req.body;
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ message: "Category name is required" });
      category.name = String(name).trim();
    }
    if (description !== undefined) category.description = String(description || "").trim();
    if (image_url !== undefined) category.image_url = String(image_url || "").trim();
    if (slug !== undefined || name !== undefined) {
      category.slug = await uniqueCategorySlug(slug || category.name, id);
    }

    await category.save();
    clearProductCache();
    res.json({ message: "Category updated", category: clean(category) });
  } catch (err) {
    console.error("[Products] Update category error:", err.message);
    res.status(500).json({ message: "Failed to update category", error: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const id = objectId(req.params.id);
    if (!id) return res.status(404).json({ message: "Category not found" });

    const productCount = await Product.countDocuments({ category_id: id, is_active: true });
    if (productCount > 0) {
      return res.status(409).json({
        message: "Move or delete products in this category before deleting it",
        productCount,
      });
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    clearProductCache();
    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error("[Products] Delete category error:", err.message);
    res.status(500).json({ message: "Failed to delete category" });
  }
};

exports.getFeatured = async (_req, res) => {
  try {
    const cached = cacheGet("featured");
    if (cached) {
      cacheHomeResponse(res);
      return res.json(cached);
    }

    const products = await Product.find({ is_featured: true, is_active: true })
      .select(PRODUCT_LIST_SELECT)
      .populate(CATEGORY_POPULATE)
      .sort({ rating: -1, review_count: -1 })
      .limit(8)
      .lean();
    const payload = products.map(productPayload);
    cacheSet("featured", payload);
    cacheHomeResponse(res);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getHomeSections = async (req, res) => {
  try {
    const limit = Math.max(4, Math.min(8, parseInt(req.query.limit, 10) || 6));
    const categoryLimit = Math.max(4, Math.min(12, parseInt(req.query.categoryLimit, 10) || 8));
    const cacheKey = `home-sections:${limit}:${categoryLimit}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      cacheHomeResponse(res);
      return res.json(cached);
    }

    const categories = await Category.find().select(CATEGORY_SELECT).sort({ name: 1 }).limit(categoryLimit).lean();
    const categoryIds = categories.map((category) => category._id);

    const groupedProducts = categoryIds.length
      ? await Product.aggregate([
          { $match: { category_id: { $in: categoryIds }, is_active: true } },
          {
            $project: {
              name: 1,
              description: 1,
              price: 1,
              original_price: 1,
              category_id: 1,
              image_url: 1,
              images: 1,
              stock: 1,
              rating: 1,
              review_count: 1,
              tags: 1,
              is_featured: 1,
              is_active: 1,
              created_at: 1,
              updated_at: 1,
            },
          },
          { $sort: { category_id: 1, is_featured: -1, created_at: -1, _id: 1 } },
          {
            $group: {
              _id: "$category_id",
              total: { $sum: 1 },
              products: { $push: "$$ROOT" },
            },
          },
          {
            $project: {
              total: 1,
              products: { $slice: ["$products", limit] },
            },
          },
        ])
      : [];

    const productsByCategory = new Map(
      groupedProducts.map((group) => [group._id.toString(), group])
    );

    const sections = categories
      .map((category) => {
        const categoryData = categoryPayload(category);
        const group = productsByCategory.get(category._id.toString());
        const products = (group?.products || []).map((product) =>
          productPayloadForCategory(product, categoryData)
        );

        return {
          category: categoryData,
          total: group?.total || products.length,
          products,
        };
      })
      .filter((section) => section.products.length > 0);

    cacheSet(cacheKey, sections);
    cacheHomeResponse(res);
    res.json(sections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
