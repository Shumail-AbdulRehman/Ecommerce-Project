import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import {
  ShoppingBag, Search, User, Menu, X, LogOut,
  LayoutDashboard, Package, UserCircle, Clock,
  Sparkles, ArrowRight, Sun, Moon,
  Bell, CheckCheck, Trash2, ShoppingCart, Info, Tag, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import api from '../../utils/api';
import { formatPrice } from '../../utils/price';

// ─── Search History Helpers ───────────────────────────────────────────────────
const HISTORY_KEY = 'luxe_search_history';
const MAX_HISTORY = 6;
const NAV_CATEGORY_LIMIT = 12;
const FALLBACK_NAV_CATEGORIES = [
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Home & Living', slug: 'home-living' },
  { name: 'Sports', slug: 'sports' },
  { name: 'Beauty', slug: 'beauty' },
  { name: 'Gaming', slug: 'gaming' },
];

function loadHistory(userId) {
  try {
    const raw = localStorage.getItem(`${HISTORY_KEY}_${userId || 'guest'}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(userId, history) {
  try {
    localStorage.setItem(`${HISTORY_KEY}_${userId || 'guest'}`, JSON.stringify(history));
  } catch {}
}

// ─── Fuzzy / Smart Match ──────────────────────────────────────────────────────
function getMatchScore(product, query) {
  const q = query.toLowerCase();
  const name = (product.name || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 90;
  if (name.includes(q)) return 80;
  if (category.includes(q)) return 60;
  let qi = 0;
  for (let i = 0; i < name.length && qi < q.length; i++) {
    if (name[i] === q[qi]) qi++;
  }
  if (qi === q.length) return 40;
  return 0;
}

function normalizeSuggestion(product) {
  return {
    ...product,
    id: product.id || product._id,
    image: product.image || product.image_url,
    category: product.category || product.category_name,
  };
}

// ─── Notification Icon by type ────────────────────────────────────────────────
function NotifIcon({ type }) {
  const base = "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm";
  if (type === 'order') return <div className={`${base} bg-blue-100 text-blue-600`}><ShoppingCart size={14} /></div>;
  if (type === 'promo') return <div className={`${base} bg-gold-100 text-gold-600`}><Tag size={14} /></div>;
  if (type === 'admin') return <div className={`${base} bg-purple-100 text-purple-600`}><LayoutDashboard size={14} /></div>;
  return <div className={`${base} bg-ink-100 text-ink-500`}><Info size={14} /></div>;
}

// ─── Time ago helper ──────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Notification Panel ───────────────────────────────────────────────────────
function NotificationPanel({ darkMode, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifs = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnread(0);
  };

  const deleteNotif = async (id, e) => {
    e.stopPropagation();
    await api.delete(`/notifications/${id}`).catch(() => {});
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClick = (notif) => {
    if (!notif.is_read) markRead(notif.id);
    if (notif.link) { navigate(notif.link); onClose(); }
  };

  const panelBg = darkMode ? 'bg-ink-900 border-ink-700' : 'bg-white border-ink-100';
  const itemHover = darkMode ? 'hover:bg-ink-800' : 'hover:bg-ink-50';
  const unreadBg = darkMode ? 'bg-ink-800' : 'bg-blue-50/60';
  const textPrimary = darkMode ? 'text-white' : 'text-ink-900';
  const textSecondary = darkMode ? 'text-ink-400' : 'text-ink-500';
  const divider = darkMode ? 'border-ink-700' : 'border-ink-100';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={`absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border shadow-xl overflow-hidden z-50 ${panelBg}`}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${divider}`}>
        <div className="flex items-center gap-2">
          <h3 className={`font-semibold text-sm ${textPrimary}`}>Notifications</h3>
          {unread > 0 && (
            <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors"
          >
            <CheckCheck size={13} /> Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center">
            <div className="w-5 h-5 border-2 border-ink-300 border-t-blue-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center">
            <Bell size={28} className={`mx-auto mb-2 ${textSecondary} opacity-40`} />
            <p className={`text-sm ${textSecondary}`}>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors group ${itemHover} ${
                !notif.is_read ? unreadBg : ''
              }`}
              onClick={() => handleClick(notif)}
            >
              {/* Unread dot */}
              {!notif.is_read && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
              )}

              <NotifIcon type={notif.type} />

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold leading-snug ${textPrimary}`}>{notif.title}</p>
                <p className={`text-xs mt-0.5 leading-relaxed ${textSecondary} line-clamp-2`}>{notif.message}</p>
                <p className="text-xs text-ink-400 mt-1">{timeAgo(notif.created_at)}</p>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => deleteNotif(notif.id, e)}
                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg ${
                  darkMode ? 'hover:bg-ink-700 text-ink-400' : 'hover:bg-ink-100 text-ink-400'
                } hover:text-red-500`}
              >
                <Trash2 size={12} />
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className={`border-t px-4 py-2 text-center ${divider}`}>
          <p className={`text-xs ${textSecondary}`}>{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────
export default function Navbar({ products = [] }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [navCategories, setNavCategories] = useState([]);

  const { darkMode, toggleTheme } = useTheme();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { cart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [smartMode, setSmartMode] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);
  const notifPollRef = useRef(null);
  const suggestionRequestRef = useRef(0);

  const isHomePage = location.pathname === '/';
  const isSolid = !isHomePage || scrolled;

  // Poll unread count every 30s when logged in
  useEffect(() => {
    if (!isAuthenticated) { setUnreadCount(0); return; }

    const fetchUnread = async () => {
      try {
        const { data } = await api.get('/notifications');
        setUnreadCount(data.unread || 0);
      } catch {}
    };

    fetchUnread();
    notifPollRef.current = setInterval(fetchUnread, 30000);
    return () => clearInterval(notifPollRef.current);
  }, [isAuthenticated]);

  useEffect(() => {
    setSearchHistory(loadHistory(user?.id));
  }, [user?.id]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let mounted = true;
    api.get('/products/categories')
      .then(({ data }) => {
        if (mounted) setNavCategories(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
    setCategoryMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
      setShowDropdown(true);
    } else {
      setSearchQuery('');
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, [searchOpen]);

  const computeSuggestions = useCallback(async (value) => {
    const query = value.trim();
    const requestId = ++suggestionRequestRef.current;

    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const { data } = await api.get('/products', { params: { search: query, limit: 6 } });
      if (requestId !== suggestionRequestRef.current) return;
      setSuggestions((data.products || []).map(normalizeSuggestion).slice(0, 6));
    } catch {
      if (requestId !== suggestionRequestRef.current) return;
      const scored = products
        .map(normalizeSuggestion)
        .map((p) => ({ ...p, _score: getMatchScore(p, query) }))
        .filter((p) => p._score > 0)
        .sort((a, b) => b._score - a._score)
        .slice(0, 6);
      setSuggestions(scored);
    }
  }, [products]);

  const handleSearchInput = (value) => {
    setSearchQuery(value);
    setShowDropdown(true);
    setActiveIndex(-1);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      suggestionRequestRef.current += 1;
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => computeSuggestions(value), 250);
  };

  const doSearch = useCallback((value = searchQuery) => {
    const q = value.trim();
    if (!q) return;
    const updated = [q, ...searchHistory.filter(h => h.toLowerCase() !== q.toLowerCase())].slice(0, MAX_HISTORY);
    setSearchHistory(updated);
    saveHistory(user?.id, updated);
    navigate(`/products?search=${encodeURIComponent(q)}&mode=${smartMode ? 'smart' : 'normal'}`);
    setSearchOpen(false);
    setSearchQuery('');
    setSuggestions([]);
  }, [searchQuery, searchHistory, smartMode, navigate, user?.id]);

  const handleKeyDown = (e) => {
    const total = suggestions.length;
    if (e.key === 'ArrowDown' && total > 0) { e.preventDefault(); setActiveIndex(i => (i + 1) % total); }
    else if (e.key === 'ArrowUp' && total > 0) { e.preventDefault(); setActiveIndex(i => (i - 1 + total) % total); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        navigate(`/products/${suggestions[activeIndex].id || suggestions[activeIndex]._id}`);
        setSearchOpen(false);
      } else { doSearch(); }
    } else if (e.key === 'Escape') { setSearchOpen(false); }
  };

  const removeHistory = (term, e) => {
    e.stopPropagation();
    const updated = searchHistory.filter(h => h !== term);
    setSearchHistory(updated);
    saveHistory(user?.id, updated);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    saveHistory(user?.id, []);
  };

  const hasDropdownContent =
    showDropdown && (suggestions.length > 0 || (searchQuery.length === 0 && searchHistory.length > 0));

  const navLinks = [
    { label: 'Shop', href: '/products' },
    { label: 'New Arrivals', href: '/products?sort=newest' },
    { label: 'Featured', href: '/products?featured=true' },
  ];

  const navCategoryItems = (navCategories.length > 0 ? navCategories : FALLBACK_NAV_CATEGORIES)
    .filter((category) => category?.name && category?.slug)
    .slice(0, NAV_CATEGORY_LIMIT);

  const navBg = isSolid
    ? darkMode
      ? 'bg-ink-950 shadow-sm border-b border-ink-800'
      : 'bg-white shadow-sm border-b border-ink-100'
    : 'bg-transparent';

  const iconClass = isSolid
    ? darkMode
      ? 'text-ink-300 hover:text-white hover:bg-ink-800'
      : 'text-ink-600 hover:text-ink-950 hover:bg-ink-100'
    : 'text-white/80 hover:text-white hover:bg-white/10';

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className={`font-display text-xl font-semibold tracking-tight transition-colors duration-300 sm:text-2xl ${
                isSolid ? darkMode ? 'text-white' : 'text-ink-950' : 'text-white'
              }`}>
                SHUMARA
              </span>
              <span className={`hidden sm:block w-1 h-1 rounded-full mt-1 ${isSolid ? 'bg-gold-500' : 'bg-gold-400'}`} />
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link key={link.href} to={link.href}
                  className={`text-sm font-medium transition-colors duration-200 ${
                    isSolid
                      ? darkMode ? 'text-ink-300 hover:text-white' : 'text-ink-600 hover:text-ink-950'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryMenuOpen((open) => !open);
                    setUserMenuOpen(false);
                    setNotifOpen(false);
                  }}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 ${
                    isSolid
                      ? darkMode ? 'text-ink-300 hover:text-white' : 'text-ink-600 hover:text-ink-950'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Categories
                  <ChevronDown
                    size={15}
                    className={`transition-transform duration-200 ${categoryMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {categoryMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className={`fixed inset-x-0 top-[72px] mx-auto w-[min(720px,calc(100vw-32px))] rounded-2xl border shadow-2xl overflow-hidden z-50 ${
                        darkMode ? 'bg-ink-900 border-ink-700' : 'bg-white border-ink-100'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-3">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
                          {navCategoryItems.map((category) => (
                            <Link
                              key={category.slug}
                              to={`/products?category=${category.slug}`}
                              className={`group rounded-xl px-3 py-2.5 transition-colors ${
                                darkMode ? 'hover:bg-ink-800' : 'hover:bg-ink-50'
                              }`}
                            >
                              <span className={`block text-sm font-semibold truncate ${
                                darkMode ? 'text-white' : 'text-ink-900'
                              }`}>
                                {category.name}
                              </span>
                              <span className="mt-0.5 block text-xs text-ink-400 truncate">
                                Browse collection
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                      <Link
                        to="/products"
                        className={`flex items-center justify-between border-t px-4 py-3 text-sm font-semibold transition-colors ${
                          darkMode
                            ? 'border-ink-700 text-gold-400 hover:bg-ink-800'
                            : 'border-ink-100 text-ink-900 hover:bg-ink-50'
                        }`}
                      >
                        Browse all products
                        <ArrowRight size={15} />
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1">

              {/* Dark Mode Toggle */}
              <button onClick={toggleTheme}
                className={`p-2 rounded-full transition-colors ${iconClass}`}
                title={darkMode ? 'Switch to Light' : 'Switch to Dark'}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Search */}
              <button onClick={() => { setSearchOpen(true); setCategoryMenuOpen(false); }}
                className={`p-2 rounded-full transition-colors ${iconClass}`}
              >
                <Search size={20} />
              </button>

              {/* Notifications Bell — only when logged in */}
              {isAuthenticated && (
                <div className="relative">
                  <button
                    onClick={() => { setNotifOpen(o => !o); setUserMenuOpen(false); setCategoryMenuOpen(false); }}
                    className={`relative p-2 rounded-full transition-colors ${iconClass}`}
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-mono font-bold leading-none"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </motion.span>
                    )}
                  </button>

                  <AnimatePresence>
                    {notifOpen && (
                      <NotificationPanel
                        darkMode={darkMode}
                        onClose={() => setNotifOpen(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Cart */}
              <Link to="/cart" className={`relative p-2 rounded-full transition-colors ${iconClass}`}>
                <ShoppingBag size={20} />
                {cart.count > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gold-500 text-ink-950 text-xs rounded-full flex items-center justify-center font-mono font-medium"
                  >
                    {cart.count > 9 ? '9+' : cart.count}
                  </motion.span>
                )}
              </Link>

              {/* User */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); setCategoryMenuOpen(false); }}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-ink-950 dark:bg-gold-500 flex items-center justify-center">
                      <span className="text-white dark:text-ink-950 text-xs font-medium">
                        {user.name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute right-0 mt-2 w-52 rounded-2xl shadow-lg border overflow-hidden z-50 ${
                          darkMode ? 'bg-ink-900 border-ink-700' : 'bg-white border-ink-100'
                        }`}
                      >
                        <div className={`p-3 border-b ${darkMode ? 'border-ink-700' : 'border-ink-100'}`}>
                          <p className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-ink-950'}`}>{user.name}</p>
                          <p className="text-xs text-ink-400 truncate">{user.email}</p>
                        </div>
                        <div className="p-1.5">
                          <Link to="/profile" className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                            darkMode ? 'text-ink-300 hover:bg-ink-800' : 'text-ink-700 hover:bg-ink-50'
                          }`}>
                            <UserCircle size={16} /> My Profile
                          </Link>
                          <Link to="/orders" className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                            darkMode ? 'text-ink-300 hover:bg-ink-800' : 'text-ink-700 hover:bg-ink-50'
                          }`}>
                            <Package size={16} /> My Orders
                          </Link>
                          {isAdmin && (
                            <Link to="/admin" className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                              darkMode ? 'text-ink-300 hover:bg-ink-800' : 'text-ink-700 hover:bg-ink-50'
                            }`}>
                              <LayoutDashboard size={16} /> Admin Dashboard
                            </Link>
                          )}
                          <button onClick={logout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <LogOut size={16} /> Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link to="/login"
                  className={`hidden sm:flex items-center gap-1.5 py-2 px-4 rounded-full text-xs font-medium transition-all duration-200 ${
                    isSolid
                      ? darkMode ? 'bg-gold-500 text-ink-950 hover:bg-gold-400' : 'bg-ink-950 text-white hover:bg-ink-800'
                      : 'bg-white text-ink-950 hover:bg-ink-100'
                  }`}
                >
                  <User size={14} /> Sign In
                </Link>
              )}

              {/* Mobile Menu Toggle */}
              <button onClick={() => setMenuOpen(!menuOpen)}
                className={`md:hidden p-2 rounded-full transition-colors ${iconClass}`}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`md:hidden overflow-hidden border-t ${
                darkMode ? 'bg-ink-950 border-ink-800' : 'bg-white border-ink-100'
              }`}
            >
              <div className="px-4 py-4 space-y-1">
                {navLinks.map((link) => (
                  <Link key={link.href} to={link.href}
                    className={`block px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                      darkMode ? 'text-ink-300 hover:bg-ink-800' : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className={`px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest ${
                  darkMode ? 'text-ink-500' : 'text-ink-400'
                }`}>
                  Categories
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {navCategoryItems.map((category) => (
                    <Link
                      key={category.slug}
                      to={`/products?category=${category.slug}`}
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors truncate ${
                        darkMode ? 'text-ink-300 hover:bg-ink-800' : 'text-ink-700 hover:bg-ink-50'
                      }`}
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
                <Link to="/products" className={`block px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  darkMode ? 'text-gold-400 hover:bg-ink-800' : 'text-ink-950 hover:bg-ink-50'
                }`}>
                  Browse all products
                </Link>
                {!isAuthenticated && (
                  <Link to="/login" className={`block px-3 py-2.5 rounded-xl font-medium text-sm ${
                    darkMode ? 'text-ink-300 hover:bg-ink-800' : 'text-ink-700 hover:bg-ink-50'
                  }`}>
                    Sign In
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── Smart Search Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-3 pt-20 sm:px-4"
            onClick={() => setSearchOpen(false)}
          >
            <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="relative w-full max-w-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`flex flex-wrap items-center gap-2 rounded-2xl px-3 py-3 shadow-2xl sm:flex-nowrap sm:gap-3 sm:px-4 ${
                darkMode ? 'bg-ink-900' : 'bg-white'
              }`}>
                <Search size={18} className="text-ink-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={smartMode ? 'Smart search — try any spelling...' : 'Search products...'}
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`min-w-0 flex-1 bg-transparent text-sm outline-none placeholder-ink-400 ${
                    darkMode ? 'text-white' : 'text-ink-900'
                  }`}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button onClick={() => { handleSearchInput(''); searchInputRef.current?.focus(); }}
                    className="text-ink-400 hover:text-ink-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  onClick={() => setSmartMode(m => !m)}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                    smartMode
                      ? 'bg-ink-950 text-white dark:bg-gold-500 dark:text-ink-950'
                      : 'bg-ink-100 text-ink-500 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300'
                  }`}
                >
                  <Sparkles size={11} />
                  {smartMode ? 'Smart' : 'Normal'}
                </button>
                <button
                  onClick={() => doSearch()}
                  className="shrink-0 rounded-full bg-ink-950 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-ink-800 dark:bg-gold-500 dark:text-ink-950 dark:hover:bg-gold-400"
                >
                  Search
                </button>
              </div>

              <AnimatePresence>
                {hasDropdownContent && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className={`mt-2 rounded-2xl shadow-xl border overflow-hidden ${
                      darkMode ? 'bg-ink-900 border-ink-700' : 'bg-white border-ink-100'
                    }`}
                  >
                    {suggestions.length > 0 && (
                      <>
                        <p className="text-xs text-ink-400 font-medium px-4 pt-3 pb-1 uppercase tracking-wider">
                          {smartMode ? 'Smart Suggestions' : 'Suggestions'}
                        </p>
                        <ul>
                          {suggestions.map((product, i) => {
                            const image = product.image || product.image_url;
                            const category = product.category || product.category_name;
                            const productId = product.id || product._id;

                            return (
                              <li key={productId || i}>
                                <button
                                  onMouseDown={() => {
                                    navigate(`/products/${productId}`);
                                    setSearchOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                    activeIndex === i
                                      ? darkMode ? 'bg-ink-800' : 'bg-ink-50'
                                      : darkMode ? 'hover:bg-ink-800' : 'hover:bg-ink-50'
                                  }`}
                                >
                                  {image && (
                                    <img src={image} alt={product.name}
                                      className="w-9 h-9 rounded-lg object-cover border border-ink-100 shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-ink-900'}`}>
                                      {product.name}
                                    </p>
                                    {category && (
                                      <p className="text-xs text-ink-400 truncate">in {category}</p>
                                    )}
                                  </div>
                                  {product.price && (
                                    <span className="text-xs font-semibold text-gold-500 shrink-0">
                                      {formatPrice(product.price)}
                                    </span>
                                  )}
                                  <ArrowRight size={14} className="text-ink-300 shrink-0" />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}

                    {suggestions.length === 0 && searchQuery.length >= 2 && (
                      <div className={`px-4 py-3 text-sm ${darkMode ? 'text-ink-400' : 'text-ink-500'}`}>
                        No results for <strong>"{searchQuery}"</strong>.{' '}
                        {!smartMode && (
                          <button onMouseDown={() => setSmartMode(true)} className="text-gold-500 underline font-medium">
                            Try Smart Search
                          </button>
                        )}
                      </div>
                    )}

                    {searchHistory.length > 0 && searchQuery.length === 0 && (
                      <>
                        <div className="flex items-center justify-between px-4 pt-3 pb-1">
                          <p className="text-xs text-ink-400 font-medium uppercase tracking-wider">Recent Searches</p>
                          <button onMouseDown={clearHistory} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                            Clear All
                          </button>
                        </div>
                        <ul>
                          {searchHistory.map((term, i) => (
                            <li key={i} className={`flex items-center px-4 transition-colors group ${
                              darkMode ? 'hover:bg-ink-800' : 'hover:bg-ink-50'
                            }`}>
                              <button
                                onMouseDown={() => { setSearchQuery(term); doSearch(term); }}
                                className={`flex items-center gap-3 flex-1 py-2.5 text-sm text-left ${
                                  darkMode ? 'text-ink-300' : 'text-ink-700'
                                }`}
                              >
                                <Clock size={13} className="text-ink-400 shrink-0" />
                                {term}
                              </button>
                              <button
                                onMouseDown={(e) => removeHistory(term, e)}
                                className="text-ink-300 hover:text-ink-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                              >
                                <X size={13} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    <div className="h-2" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close dropdowns on outside click */}
      {(userMenuOpen || notifOpen || categoryMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setUserMenuOpen(false);
            setNotifOpen(false);
            setCategoryMenuOpen(false);
          }}
        />
      )}
    </>
  );
}
