import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatPrice } from "../utils/price";
import {
  LayoutDashboard, Package, ShoppingCart, DollarSign,
  Plus, Pencil, Trash2, X, Loader, TrendingUp, ArrowUpRight,
  ArrowDownRight, Search, Eye, Save, Tags, Truck, Receipt,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const TAB_CONFIG = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'orders', label: 'Orders', icon: ShoppingCart },
  { key: 'categories', label: 'Categories', icon: Tags },
];

const PRODUCTS_PER_PAGE = 20;

const ORDER_STATUSES = ['pending', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const STATUS_COLORS = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  dispatched: 'bg-blue-50 text-blue-700 border-blue-100',
  out_for_delivery: 'bg-purple-50 text-purple-700 border-purple-100',
  delivered: 'bg-green-50 text-green-700 border-green-100',
  cancelled: 'bg-red-50 text-red-700 border-red-100',
};

const PAYMENT_COLORS = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  paid: 'bg-green-50 text-green-700 border-green-100',
  failed: 'bg-red-50 text-red-700 border-red-100',
  refunded: 'bg-blue-50 text-blue-700 border-blue-100',
};

const emptyShipping = {
  name: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  country: 'Pakistan',
};

const normalize = (value) => String(value || '').toLowerCase();
const labelize = (value) => String(value || '').replace(/_/g, ' ');
const displayDate = (value) => value ? new Date(value).toLocaleDateString('en-PK', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}) : '-';

function getOrderCustomer(order) {
  return {
    name: order?.user_name || order?.name || order?.shipping_address?.name || order?.shippingAddress?.name || 'Guest customer',
    email: order?.user_email || order?.email || '',
  };
}

function getOrderAddress(order) {
  return order?.shipping_address || order?.shippingAddress || {};
}

function Badge({ value, colors }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${colors[value] || 'bg-ink-50 text-ink-700 border-ink-100'}`}>
      {labelize(value)}
    </span>
  );
}

function ActionButton({ children, className = '', ...props }) {
  return (
    <button
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-950 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, color, sub, trend, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card p-5"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon size={18} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="font-mono text-2xl font-bold text-ink-950">{value}</p>
      <p className="mt-0.5 text-sm text-ink-500">{label}</p>
      {sub && <p className="mt-1 text-xs text-ink-400">{sub}</p>}
    </motion.div>
  );
}

function RevenueChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="mt-4 flex h-44 items-center justify-center rounded-2xl bg-ink-50 text-sm text-ink-400">
        No revenue data for the last 7 days
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => Number(d.revenue || 0)), 1);

  return (
    <div className="mt-4 rounded-2xl bg-ink-50 p-4 pt-6">
      <div className="flex h-40 items-end gap-3">
        {data.map((d, i) => {
          const height = Math.max((Number(d.revenue || 0) / maxRevenue) * 85, 4);
          const label = new Date(d.date).toLocaleDateString('en-PK', { weekday: 'short' });
          return (
            <motion.div
              key={d.date}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.55, delay: i * 0.06, ease: 'easeOut' }}
              className="group relative flex flex-1 flex-col justify-end"
            >
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-950 px-2.5 py-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                <p className="font-medium">{formatPrice(Number(d.revenue || 0))}</p>
                <p className="text-ink-400">{d.orders} orders</p>
              </div>
              <div className="h-full w-full cursor-default rounded-t-xl bg-ink-700 transition-colors hover:bg-gold-500" />
              <p className="mt-2 text-center text-xs font-medium text-ink-500">{label}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function TopProductsChart({ products }) {
  if (!products || products.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-400">No sales data yet</p>;
  }

  const max = Math.max(...products.map((p) => p.total_sold || 0), 1);

  return (
    <div className="mt-4 space-y-3">
      {products.map((p, i) => (
        <motion.div
          key={`${p.product_name}-${i}`}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3"
        >
          <span className="w-4 font-mono text-xs text-ink-400">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex justify-between text-sm">
              <span className="max-w-[220px] truncate font-medium text-ink-800">{p.product_name}</span>
              <span className="ml-2 shrink-0 text-ink-500">{p.total_sold} sold</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(p.total_sold / max) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.08 }}
                className="h-full rounded-full bg-ink-950"
              />
            </div>
          </div>
          <span className="w-24 text-right text-xs font-semibold text-ink-700">
            {formatPrice(Number(p.total_revenue || 0))}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function PaginationControls({ page, pageCount, total, pageSize, onPageChange }) {
  if (pageCount <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)
    .filter((item) => item === 1 || item === pageCount || Math.abs(item - page) <= 1);

  return (
    <div className="flex flex-col gap-3 border-t border-ink-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-ink-400">
        Showing <span className="font-semibold text-ink-700">{start}-{end}</span> of <span className="font-semibold text-ink-700">{total}</span> products
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-100 px-3 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        {pages.map((item, index) => {
          const previous = pages[index - 1];
          return (
            <div key={item} className="flex items-center gap-1">
              {previous && item - previous > 1 && <span className="px-1 text-xs text-ink-300">...</span>}
              <button
                type="button"
                onClick={() => onPageChange(item)}
                className={`h-9 min-w-9 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  item === page ? 'bg-ink-950 text-white' : 'border border-ink-100 text-ink-600 hover:bg-ink-50'
                }`}
              >
                {item}
              </button>
            </div>
          );
        })}
        <button
          type="button"
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-100 px-3 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children, maxWidth = 'max-w-2xl' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className={`relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${maxWidth}`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-ink-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-950">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-950">
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function ProductModal({ product, categories, onClose, onSave }) {
  const isEdit = !!product?.id;
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    original_price: product?.original_price || '',
    category_id: product?.category_id || '',
    image_url: product?.image_url || '',
    stock: product?.stock ?? 0,
    is_featured: product?.is_featured || false,
    tags: Array.isArray(product?.tags) ? product.tags.join(', ') : '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        original_price: form.original_price ? Number(form.original_price) : null,
        stock: parseInt(form.stock, 10) || 0,
        tags: form.tags ? form.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
        images: form.image_url ? [form.image_url] : [],
      };

      if (isEdit) {
        await api.put(`/products/${product.id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/products', payload);
        toast.success('Product created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={isEdit ? 'Edit Product' : 'Add Product'}
      subtitle="Inventory, pricing, images, featured state, and tags"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">Product Name *</label>
          <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">Description</label>
          <textarea className="input-field h-24 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-600">Price *</label>
            <input type="number" step="0.01" className="input-field" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-600">Original Price</label>
            <input type="number" step="0.01" className="input-field" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-600">Category</label>
            <select className="input-field" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-600">Stock</label>
            <input type="number" className="input-field" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">Image URL</label>
          <input className="input-field" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          {form.image_url && (
            <div className="mt-2 h-24 w-24 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
              <img src={form.image_url} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">Tags</label>
          <input className="input-field" placeholder="comma separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="h-4 w-4 rounded accent-ink-900" />
          <span className="text-sm font-medium text-ink-700">Feature on storefront rows</span>
        </label>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? <><Loader size={14} className="animate-spin" /> Saving</> : <><Save size={14} /> {isEdit ? 'Update Product' : 'Create Product'}</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function CategoryModal({ category, onClose, onSave }) {
  const isEdit = !!category?.id;
  const [form, setForm] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
    image_url: category?.image_url || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/products/categories/${category.id}`, form);
        toast.success('Category updated');
      } else {
        await api.post('/products/categories', form);
        toast.success('Category created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title={isEdit ? 'Edit Category' : 'Add Category'} subtitle="Category details used across storefront product rows" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-600">Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-600">Slug</label>
            <input className="input-field" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated if empty" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">Description</label>
          <textarea className="input-field h-24 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-600">Image URL</label>
          <input className="input-field" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? <><Loader size={14} className="animate-spin" /> Saving</> : <><Save size={14} /> {isEdit ? 'Update Category' : 'Create Category'}</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function OrderModal({ order, customers, products, onClose, onSave, onDelete }) {
  const isEdit = !!order?.id;
  const sourceAddress = getOrderAddress(order);
  const [form, setForm] = useState({
    customer_id: order?.user_id || '',
    status: order?.status || 'pending',
    payment_status: order?.payment_status || 'pending',
    payment_method: 'cash_on_delivery',
    total_amount: order?.total_amount || '',
    notes: order?.notes || '',
    cancel_reason: order?.cancel_reason || '',
  });
  const [shipping, setShipping] = useState({ ...emptyShipping, ...sourceAddress });
  const [lineItems, setLineItems] = useState([{ product_id: '', quantity: 1 }]);
  const [loading, setLoading] = useState(false);

  const selectedLines = useMemo(() => lineItems.map((line) => {
    const product = products.find((p) => p.id === line.product_id);
    const quantity = Math.max(1, parseInt(line.quantity, 10) || 1);
    return { ...line, quantity, product, lineTotal: product ? product.price * quantity : 0 };
  }), [lineItems, products]);

  const manualSubtotal = selectedLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const manualTotal = manualSubtotal + (manualSubtotal >= 999 || manualSubtotal === 0 ? 0 : 49);

  const updateLine = (index, patch) => {
    setLineItems((prev) => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const removeLine = (index) => {
    setLineItems((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        const payload = {
          status: form.status,
          payment_status: form.payment_status,
          payment_method: 'cash_on_delivery',
          total_amount: Number(form.total_amount || 0),
          notes: form.notes,
          cancel_reason: form.status === 'cancelled' ? form.cancel_reason : null,
          shipping_address: shipping,
        };
        await api.put(`/orders/${order.id}`, payload);
        toast.success('Order updated');
      } else {
        const items = selectedLines
          .filter((line) => line.product_id)
          .map((line) => ({ product_id: line.product_id, quantity: line.quantity }));

        if (!form.customer_id) throw new Error('Select a customer');
        if (items.length === 0) throw new Error('Add at least one product');

        await api.post('/orders/admin', {
          user_id: form.customer_id,
          items,
          shippingAddress: shipping,
          paymentMethod: 'cash_on_delivery',
          payment_status: form.payment_status,
          status: form.status,
          notes: form.notes,
        });
        toast.success('Order created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={isEdit ? `Order #${order.id}` : 'Create Manual Order'}
      subtitle={isEdit ? 'Edit fulfillment, payment, notes, and shipping address' : 'Create an order for a selected customer'}
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink-600">Customer</label>
            {isEdit ? (
              <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                <p className="text-sm font-semibold text-ink-950">{getOrderCustomer(order).name}</p>
                <p className="text-xs text-ink-500">{getOrderCustomer(order).email || 'No email'}</p>
              </div>
            ) : (
              <select className="input-field" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name} - {customer.email}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-600">Order Status</label>
            <select className="input-field capitalize" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {ORDER_STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-600">Payment Status</label>
            <select className="input-field capitalize" value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}>
              {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
            </select>
          </div>
        </div>

        {!isEdit && (
          <div className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink-950">Order Items</h3>
                <p className="text-xs text-ink-400">Stock will be reduced when the order is created</p>
              </div>
              <button type="button" onClick={() => setLineItems((prev) => [...prev, { product_id: '', quantity: 1 }])} className="btn-ghost">
                <Plus size={14} /> Add Item
              </button>
            </div>
            <div className="space-y-3">
              {lineItems.map((line, index) => {
                const product = products.find((p) => p.id === line.product_id);
                return (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-ink-100 bg-white p-3 sm:grid-cols-[1fr_110px_44px]">
                    <select className="input-field" value={line.product_id} onChange={(e) => updateLine(index, { product_id: e.target.value })}>
                      <option value="">Select product</option>
                      {products.map((productOption) => (
                        <option key={productOption.id} value={productOption.id}>
                          {productOption.name} - {formatPrice(productOption.price)} - stock {productOption.stock}
                        </option>
                      ))}
                    </select>
                    <input type="number" min="1" className="input-field" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} />
                    <ActionButton type="button" onClick={() => removeLine(index)} className="hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={15} />
                    </ActionButton>
                    {product && (
                      <p className="text-xs text-ink-500 sm:col-span-3">
                        Line total: {formatPrice(Number(product.price || 0) * (parseInt(line.quantity, 10) || 1))}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex justify-end text-sm">
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-ink-950">
                Estimated total: {formatPrice(manualTotal)}
              </span>
            </div>
          </div>
        )}

        {isEdit && (
          <div className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink-950">Items</h3>
            <div className="space-y-2">
              {(order.items || []).map((item, index) => (
                <div key={`${item.product_id}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    {item.product_image && <img src={item.product_image} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">{item.product_name}</p>
                      <p className="text-xs text-ink-400">Qty {item.quantity} x {formatPrice(item.price)}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-ink-950">{formatPrice(Number(item.price || 0) * Number(item.quantity || 0))}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-600">Payment Method</label>
            <input className="input-field bg-ink-50" value="Cash on Delivery" readOnly />
          </div>
          {isEdit && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-600">Order Total</label>
              <input type="number" step="0.01" className="input-field" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
            </div>
          )}
          <div className={isEdit ? '' : 'sm:col-span-2'}>
            <label className="mb-1.5 block text-xs font-medium text-ink-600">Admin Notes</label>
            <input className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        {form.status === 'cancelled' && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-600">Cancel Reason</label>
            <input className="input-field" value={form.cancel_reason} onChange={(e) => setForm({ ...form, cancel_reason: e.target.value })} />
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Truck size={16} className="text-ink-500" />
            <h3 className="text-sm font-semibold text-ink-950">Shipping Address</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['name', 'Recipient', 'Ali Khan'],
              ['phone', 'Phone', '03001234567'],
              ['address', 'Address', 'House 12, Block B, Gulberg III'],
              ['city', 'City', 'Lahore'],
              ['state', 'Province/Region', 'Punjab'],
              ['zip', 'Postal code', '54000'],
              ['country', 'Country', 'Pakistan'],
            ].map(([key, label, placeholder]) => (
              <div key={key} className={key === 'address' ? 'sm:col-span-2' : ''}>
                <label className="mb-1.5 block text-xs font-medium text-ink-600">{label}</label>
                <input
                  className="input-field"
                  value={shipping[key] || ''}
                  placeholder={placeholder}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  onChange={(e) => setShipping({ ...shipping, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          {isEdit && (
            <button type="button" onClick={() => onDelete(order.id)} className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-6 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
              <Trash2 size={14} /> Delete Order
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-outline sm:ml-auto">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <><Loader size={14} className="animate-spin" /> Saving</> : <><Save size={14} /> {isEdit ? 'Update Order' : 'Create Order'}</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [productModal, setProductModal] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);
  const [orderModal, setOrderModal] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [categorySearch, setCategorySearch] = useState('');

  useEffect(() => {
    const root = document.documentElement;
    const hadDarkMode = root.classList.contains('dark');
    root.classList.remove('dark');

    return () => {
      if (hadDarkMode) root.classList.add('dark');
    };
  }, []);

  const fetchProductsForAdmin = async () => {
    const first = await api.get('/products', { params: { limit: 200, page: 1 } });
    const productList = [...(first.data.products || [])];
    const pages = first.data.pagination?.pages || 1;

    if (pages > 1) {
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, index) => api.get('/products', { params: { limit: 200, page: index + 2 } }))
      );
      rest.forEach((response) => productList.push(...(response.data.products || [])));
    }

    return productList;
  };

  const invalidateDashboardData = (...keys) => {
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  };

  const wantsOverviewData = activeTab === 'overview';
  const wantsProductsData = activeTab === 'products' || Boolean(productModal) || Boolean(orderModal);
  const wantsOrdersData = activeTab === 'orders';
  const wantsCategoriesData = activeTab === 'categories' || activeTab === 'products' || Boolean(productModal) || Boolean(categoryModal);
  const wantsCustomersData = Boolean(orderModal);

  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/orders/admin/stats');
      return data;
    },
    enabled: wantsOverviewData,
    staleTime: 30 * 1000,
  });

  const topProductsQuery = useQuery({
    queryKey: ['admin', 'top-products'],
    queryFn: async () => {
      const { data } = await api.get('/orders/admin/top-products');
      return data;
    },
    enabled: wantsOverviewData,
    staleTime: 30 * 1000,
  });

  const productsQuery = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: fetchProductsForAdmin,
    enabled: wantsProductsData,
    staleTime: 30 * 1000,
  });

  const ordersQuery = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: async () => {
      const { data } = await api.get('/orders/admin/all', { params: { limit: 200 } });
      return data || [];
    },
    enabled: wantsOrdersData,
    staleTime: 20 * 1000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: async () => {
      const { data } = await api.get('/products/categories');
      return data || [];
    },
    enabled: wantsCategoriesData,
    staleTime: 60 * 1000,
  });

  const customersQuery = useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: async () => {
      const { data } = await api.get('/admin/customers');
      return data || [];
    },
    enabled: wantsCustomersData,
    staleTime: 60 * 1000,
  });

  const stats = statsQuery.data || null;
  const topProducts = topProductsQuery.data || [];
  const products = productsQuery.data || [];
  const orders = ordersQuery.data || [];
  const categories = categoriesQuery.data || [];
  const customers = customersQuery.data || [];

  const tabLoading =
    (activeTab === 'overview' && (statsQuery.isLoading || topProductsQuery.isLoading)) ||
    (activeTab === 'products' && (productsQuery.isLoading || categoriesQuery.isLoading)) ||
    (activeTab === 'orders' && ordersQuery.isLoading) ||
    (activeTab === 'categories' && categoriesQuery.isLoading);

  useEffect(() => {
    const error = statsQuery.error || topProductsQuery.error || productsQuery.error || ordersQuery.error || categoriesQuery.error || customersQuery.error;
    if (error) toast.error(error.response?.data?.message || 'Failed to load dashboard data');
  }, [statsQuery.error, topProductsQuery.error, productsQuery.error, ordersQuery.error, categoriesQuery.error, customersQuery.error]);

  const filteredProducts = useMemo(() => {
    const q = normalize(productSearch);
    if (!q) return products;
    return products.filter((product) => (
      normalize(product.name).includes(q) ||
      normalize(product.category_name).includes(q) ||
      normalize((product.tags || []).join(' ')).includes(q)
    ));
  }, [productSearch, products]);

  const productPageCount = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const safePage = Math.min(productPage, productPageCount);
    const start = (safePage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, productPage, productPageCount]);

  useEffect(() => {
    setProductPage(1);
  }, [productSearch]);

  useEffect(() => {
    if (productPage > productPageCount) setProductPage(productPageCount);
  }, [productPage, productPageCount]);

  const filteredOrders = useMemo(() => {
    const q = normalize(orderSearch);
    return orders.filter((order) => {
      const customer = getOrderCustomer(order);
      const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
      const matchesSearch = !q ||
        normalize(order.id).includes(q) ||
        normalize(customer.name).includes(q) ||
        normalize(customer.email).includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [orderSearch, orderStatusFilter, orders]);

  const filteredCategories = useMemo(() => {
    const q = normalize(categorySearch);
    if (!q) return categories;
    return categories.filter((category) => normalize(category.name).includes(q) || normalize(category.slug).includes(q));
  }, [categorySearch, categories]);

  const statusCount = useMemo(() => {
    if (stats?.statusCounts) return stats.statusCounts;
    return orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
  }, [orders, stats?.statusCounts]);

  const categoryProductCount = useMemo(() => {
    return categories.reduce((acc, category) => {
      acc[category.id] = Number(category.product_count || 0);
      return acc;
    }, {});
  }, [categories]);

  const lowStockProducts = stats?.lowStockProducts || [];

  const handleDeleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      invalidateDashboardData(['admin', 'products'], ['products'], ['admin', 'stats']);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete this category? Products must be moved first.')) return;
    try {
      await api.delete(`/products/categories/${id}`);
      toast.success('Category deleted');
      invalidateDashboardData(['products', 'categories'], ['admin', 'stats']);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleOrderStatusChange = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      toast.success('Order status updated');
      queryClient.setQueryData(['admin', 'orders'], (current = []) => (
        current.map((order) => order.id === orderId ? { ...order, status } : order)
      ));
      invalidateDashboardData(['admin', 'stats']);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!confirm('Delete this order? This removes it from order history.')) return;
    try {
      await api.delete(`/orders/${id}`);
      toast.success('Order deleted');
      setOrderModal(null);
      invalidateDashboardData(['admin', 'orders'], ['admin', 'stats'], ['admin', 'top-products']);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete order');
    }
  };

  const renderHeaderAction = () => {
    if (activeTab === 'products') {
      return (
        <button onClick={() => setProductModal({})} className="btn-primary">
          <Plus size={16} /> Add Product
        </button>
      );
    }
    if (activeTab === 'orders') {
      return (
        <button onClick={() => setOrderModal({})} className="btn-primary">
          <Plus size={16} /> Manual Order
        </button>
      );
    }
    if (activeTab === 'categories') {
      return (
        <button onClick={() => setCategoryModal({})} className="btn-primary">
          <Plus size={16} /> Add Category
        </button>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-ink-50 pt-16">
      <div className="border-b border-ink-100 bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">Shumara Admin</p>
            <h1 className="text-2xl font-semibold text-ink-950">Ecommerce Dashboard</h1>
            <p className="mt-0.5 text-sm text-ink-400">Products, categories, orders, inventory, and sales activity</p>
          </div>
          {renderHeaderAction()}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex w-full gap-1 overflow-x-auto rounded-2xl border border-ink-100 bg-white p-1.5 shadow-sm sm:w-fit">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeTab === key ? 'bg-ink-950 text-white shadow-sm' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-950'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {tabLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader size={32} className="animate-spin text-ink-400" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <StatCard index={0} icon={DollarSign} label="Total Revenue" value={formatPrice(stats?.total_revenue || 0)} color="bg-green-50 text-green-700" trend={12} />
                  <StatCard index={1} icon={ShoppingCart} label="Total Orders" value={stats?.total_orders || 0} color="bg-blue-50 text-blue-700" trend={8} />
                  <StatCard index={2} icon={Package} label="Products" value={stats?.total_products || 0} color="bg-purple-50 text-purple-700" sub={`${lowStockProducts.length} low stock`} />
                  <StatCard index={3} icon={Tags} label="Categories" value={stats?.total_categories || 0} color="bg-orange-50 text-orange-700" sub={`${lowStockProducts.length} low-stock items`} />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="card bg-white p-6 lg:col-span-2">
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="font-semibold text-ink-950">Revenue - Last 7 Days</h3>
                      <span className="rounded-full bg-ink-50 px-2.5 py-1 text-xs text-ink-400">
                        {formatPrice((stats?.dailyRevenue || []).reduce((sum, item) => sum + Number(item.revenue || 0), 0))} total
                      </span>
                    </div>
                    <RevenueChart data={stats?.dailyRevenue || []} />
                  </div>

                  <div className="card p-6">
                    <h3 className="mb-4 font-semibold text-ink-950">Order Status</h3>
                    <div className="space-y-3">
                      {ORDER_STATUSES.map((status) => {
                        const count = statusCount[status] || 0;
                        const total = stats?.total_orders || orders.length || 1;
                        return (
                          <div key={status} className="flex items-center gap-2">
                            <Badge value={status} colors={STATUS_COLORS} />
                            <span className="ml-auto text-sm font-semibold text-ink-950">{count}</span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-100">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(count / total) * 100}%` }}
                                className="h-full rounded-full bg-ink-950"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="card p-6">
                    <div className="mb-5 flex items-center gap-2">
                      <TrendingUp size={18} className="text-ink-600" />
                      <h3 className="font-semibold text-ink-950">Top Products</h3>
                    </div>
                    <TopProductsChart products={topProducts} />
                  </div>

                  <div className="card p-6">
                    <div className="mb-5 flex items-center gap-2">
                      <Package size={18} className="text-ink-600" />
                      <h3 className="font-semibold text-ink-950">Low Stock Watchlist</h3>
                    </div>
                    <div className="space-y-3">
                      {lowStockProducts.length === 0 && <p className="py-8 text-center text-sm text-ink-400">No low stock products</p>}
                      {lowStockProducts.map((product) => (
                        <div key={product.id} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3">
                          <img src={product.image_url} alt="" className="h-10 w-10 rounded-lg bg-ink-100 object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink-900">{product.name}</p>
                            <p className="text-xs text-ink-400">{product.category_name || 'Uncategorized'}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${product.stock === 0 ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-700'}`}>
                            {product.stock === 0 ? 'Out' : product.stock}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="mb-5 flex items-center gap-2">
                    <Receipt size={18} className="text-ink-600" />
                    <h3 className="font-semibold text-ink-950">Recent Orders</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ink-100 text-left">
                          {['Order', 'Customer', 'Amount', 'Payment', 'Status', 'Date'].map((header) => (
                            <th key={header} className="pb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-50">
                        {(stats?.recentOrders || []).map((order) => {
                          const customer = getOrderCustomer(order);
                          return (
                            <tr key={order.id} className="hover:bg-ink-50">
                              <td className="py-3 font-mono text-ink-700">#{order.id}</td>
                              <td className="py-3">
                                <div className="font-medium text-ink-900">{customer.name}</div>
                                <div className="text-xs text-ink-400">{customer.email}</div>
                              </td>
                              <td className="py-3 font-semibold">{formatPrice(order.total_amount || 0)}</td>
                              <td className="py-3"><Badge value={order.payment_status || 'pending'} colors={PAYMENT_COLORS} /></td>
                              <td className="py-3"><Badge value={order.status} colors={STATUS_COLORS} /></td>
                              <td className="py-3 text-ink-400">{displayDate(order.created_at)}</td>
                            </tr>
                          );
                        })}
                        {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
                          <tr><td colSpan={6} className="py-8 text-center text-sm text-ink-400">No orders yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-4">
                <div className="card flex items-center gap-3 p-3">
                  <Search size={16} className="text-ink-400" />
                  <input
                    type="text"
                    placeholder="Search products by name, category, or tag"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
                  />
                  <span className="shrink-0 text-xs text-ink-400">
                    {filteredProducts.length} products · page {Math.min(productPage, productPageCount)} of {productPageCount}
                  </span>
                </div>

                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-ink-100 bg-ink-50">
                        <tr>
                          {['Product', 'Category', 'Price', 'Stock', 'Rating', 'Featured', ''].map((header) => (
                            <th key={header} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-50">
                        {paginatedProducts.map((product) => (
                          <tr key={product.id} className="transition-colors hover:bg-ink-50">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <img src={product.image_url} alt={product.name} className="h-11 w-11 rounded-lg bg-ink-100 object-cover" />
                                <div className="min-w-0">
                                  <div className="max-w-[240px] truncate font-medium text-ink-900">{product.name}</div>
                                  <div className="max-w-[260px] truncate text-xs text-ink-400">{(product.tags || []).slice(0, 3).join(', ')}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-xs text-ink-500">{product.category_name || '-'}</td>
                            <td className="px-5 py-3 font-semibold">{formatPrice(product.price || 0)}</td>
                            <td className="px-5 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                product.stock === 0 ? 'bg-red-50 text-red-600'
                                : product.stock <= 10 ? 'bg-yellow-50 text-yellow-600'
                                : 'bg-green-50 text-green-600'
                              }`}>
                                {product.stock === 0 ? 'Out of stock' : product.stock}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-xs text-ink-500">{Number(product.rating || 0).toFixed(1)}</td>
                            <td className="px-5 py-3 text-xs">{product.is_featured ? <span className="font-semibold text-gold-600">Featured</span> : <span className="text-ink-300">No</span>}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1">
                                <ActionButton onClick={() => setProductModal(product)}><Pencil size={14} /></ActionButton>
                                <ActionButton onClick={() => handleDeleteProduct(product.id)} className="hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></ActionButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                          <tr><td colSpan={7} className="py-12 text-center text-ink-400">No products found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <PaginationControls
                    page={Math.min(productPage, productPageCount)}
                    pageCount={productPageCount}
                    total={filteredProducts.length}
                    pageSize={PRODUCTS_PER_PAGE}
                    onPageChange={setProductPage}
                  />
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="card grid grid-cols-1 gap-3 p-3 lg:grid-cols-[1fr_220px]">
                  <div className="flex items-center gap-3">
                    <Search size={16} className="text-ink-400" />
                    <input
                      type="text"
                      placeholder="Search orders by id, customer, or email"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
                    />
                  </div>
                  <select className="input-field py-2.5 capitalize" value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)}>
                    <option value="all">All statuses</option>
                    {ORDER_STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
                  </select>
                </div>

                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-ink-100 bg-ink-50">
                        <tr>
                          {['Order', 'Customer', 'Items', 'Amount', 'Payment', 'Status', 'Date', ''].map((header) => (
                            <th key={header} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-50">
                        {filteredOrders.map((order) => {
                          const customer = getOrderCustomer(order);
                          return (
                            <tr key={order.id} className="transition-colors hover:bg-ink-50">
                              <td className="px-5 py-3 font-mono text-ink-700">#{order.id}</td>
                              <td className="px-5 py-3">
                                <div className="font-medium text-ink-900">{customer.name}</div>
                                <div className="text-xs text-ink-400">{customer.email}</div>
                              </td>
                              <td className="px-5 py-3 text-xs text-ink-500">{order.items?.length || 0}</td>
                              <td className="px-5 py-3 font-semibold">{formatPrice(order.total_amount || 0)}</td>
                              <td className="px-5 py-3"><Badge value={order.payment_status || 'pending'} colors={PAYMENT_COLORS} /></td>
                              <td className="px-5 py-3">
                                <select
                                  value={order.status}
                                  onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium capitalize outline-none ${STATUS_COLORS[order.status] || 'bg-ink-50 text-ink-700 border-ink-100'}`}
                                >
                                  {ORDER_STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
                                </select>
                              </td>
                              <td className="px-5 py-3 text-ink-400">{displayDate(order.created_at)}</td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-1">
                                  <ActionButton onClick={() => setOrderModal(order)}><Eye size={14} /></ActionButton>
                                  <ActionButton onClick={() => handleDeleteOrder(order.id)} className="hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></ActionButton>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredOrders.length === 0 && (
                          <tr><td colSpan={8} className="py-12 text-center text-ink-400">No orders found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="space-y-4">
                <div className="card flex items-center gap-3 p-3">
                  <Search size={16} className="text-ink-400" />
                  <input
                    type="text"
                    placeholder="Search categories"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
                  />
                  <span className="shrink-0 text-xs text-ink-400">{filteredCategories.length} categories</span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredCategories.map((category) => (
                    <motion.div key={category.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
                      <div className="flex gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                          {category.image_url ? <img src={category.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-ink-300"><Tags size={22} /></div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="truncate font-semibold text-ink-950">{category.name}</h3>
                              <p className="truncate text-xs text-ink-400">/{category.slug}</p>
                            </div>
                            <span className="rounded-full bg-ink-50 px-2 py-1 text-xs font-medium text-ink-500">
                              {categoryProductCount[category.id] || 0} items
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm text-ink-500">{category.description || 'No description yet'}</p>
                          <div className="mt-4 flex items-center gap-1">
                            <ActionButton onClick={() => setCategoryModal(category)}><Pencil size={14} /></ActionButton>
                            <ActionButton onClick={() => handleDeleteCategory(category.id)} className="hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></ActionButton>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {filteredCategories.length === 0 && (
                    <div className="card col-span-full p-12 text-center text-sm text-ink-400">No categories found</div>
                  )}
                </div>
              </div>
            )}

          </>
        )}
      </div>

      <AnimatePresence>
        {productModal && (
          <ProductModal
            product={productModal.id ? productModal : null}
            categories={categories}
            onClose={() => setProductModal(null)}
            onSave={() => {
              setProductModal(null);
              invalidateDashboardData(['admin', 'products'], ['products'], ['admin', 'stats']);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {categoryModal && (
          <CategoryModal
            category={categoryModal.id ? categoryModal : null}
            onClose={() => setCategoryModal(null)}
            onSave={() => {
              setCategoryModal(null);
              invalidateDashboardData(['products', 'categories'], ['admin', 'stats']);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {orderModal && (
          <OrderModal
            order={orderModal.id ? orderModal : null}
            customers={customers}
            products={products}
            onClose={() => setOrderModal(null)}
            onSave={() => {
              setOrderModal(null);
              invalidateDashboardData(['admin', 'orders'], ['admin', 'stats'], ['admin', 'top-products'], ['admin', 'products']);
            }}
            onDelete={handleDeleteOrder}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
