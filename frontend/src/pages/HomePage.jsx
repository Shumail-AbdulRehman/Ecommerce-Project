import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Star, Shield, Truck, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import ProductCard from '../components/product/ProductCard';
import { ProductCardSkeleton } from '../components/common/Skeletons';

const FALLBACK_CATEGORIES = [
  { name: 'Electronics', slug: 'electronics', image_url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&auto=format' },
  { name: 'Fashion', slug: 'fashion', image_url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&auto=format' },
  { name: 'Home & Living', slug: 'home-living', image_url: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=600&auto=format' },
  { name: 'Sports', slug: 'sports', image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&auto=format' },
  { name: 'Beauty', slug: 'beauty', image_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format' },
];

const HOME_SECTION_PRODUCT_LIMIT = 6;
const HOME_SECTION_CATEGORY_LIMIT = 8;

function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <section ref={ref} className="relative flex min-h-[100svh] overflow-hidden py-24 sm:min-h-[720px] sm:max-h-[900px] sm:items-center">
      <motion.div style={{ y, scale }} className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&q=80"
          alt="Shumara premium storefront"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/70 via-ink-950/30 to-transparent" />
      </motion.div>

      <motion.div
        style={{ opacity }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
      >
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/20 px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest text-gold-300 sm:mb-6 sm:px-4 sm:text-xs">
              New Collection 2026
            </span>
            <h1 className="mb-5 font-display text-4xl font-semibold leading-[1.05] text-white sm:text-5xl md:text-7xl">
              Crafted for<br />
              <em className="text-gold-400 not-italic">those who</em><br />
              demand more.
            </h1>
            <p className="mb-7 max-w-md text-base leading-relaxed text-ink-200 sm:mb-8 sm:text-lg">
              Discover premium products curated across fashion, tech, home, travel, wellness, gaming, and everyday essentials.
            </p>
            <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:items-center">
              <Link to="/products" className="btn-primary bg-white text-ink-950 hover:bg-ink-100 px-6 py-3 sm:px-8 sm:py-3.5">
                Shop Now
                <ArrowRight size={16} />
              </Link>
              <Link to="/products?featured=true" className="btn-outline border-white text-white hover:bg-white hover:text-ink-950 px-6 py-3 sm:px-8 sm:py-3.5">
                Featured Picks
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-10 grid grid-cols-3 gap-4 border-t border-white/20 pt-6 sm:mt-14 sm:flex sm:items-center sm:gap-8 sm:pt-8"
          >
            {[
              { value: '200+', label: 'Curated Products' },
              { value: '11', label: 'Premium Categories' },
              { value: '4.7', label: 'Avg. Rating' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-mono text-xl font-semibold text-white sm:text-2xl">{stat.value}</div>
                <div className="text-xs text-ink-300 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1.5 sm:flex"
      >
        <span className="text-white/50 text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-white/50 to-transparent" />
      </motion.div>
    </section>
  );
}

function CategorySection({ sections }) {
  const categories = sections.length > 0
    ? sections.map((section) => section.category)
    : FALLBACK_CATEGORIES;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mb-8 flex items-end justify-between sm:mb-10">
        <div>
          <span className="text-xs text-gold-600 font-medium tracking-widest uppercase">Browse by</span>
          <h2 className="section-title mt-1">Categories</h2>
        </div>
        <Link to="/products" className="hidden sm:flex items-center gap-1 text-sm text-ink-600 hover:text-ink-950 font-medium transition-colors">
          View All <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {categories.slice(0, 10).map((cat, i) => (
          <motion.div
            key={cat.slug}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.06 }}
          >
            <Link
              to={`/products?category=${cat.slug}`}
              className="group relative block aspect-[4/5] overflow-hidden rounded-xl bg-ink-100 sm:rounded-2xl"
            >
              <img
                src={cat.image_url}
                alt={cat.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                <span className="text-sm font-semibold text-white">{cat.name}</span>
                {cat.description && (
                  <p className="text-white/65 text-xs line-clamp-2 mt-1">{cat.description}</p>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function FeaturesBar() {
  const features = [
    { icon: Truck, title: 'Free Shipping', desc: 'On orders over PKR 999' },
    { icon: Shield, title: 'Secure Checkout', desc: '256-bit SSL encryption' },
    { icon: RefreshCw, title: 'Easy Returns', desc: '30-day hassle-free returns' },
    { icon: Star, title: 'Top Rated', desc: 'Curated customer favorites' },
  ];

  return (
    <section className="border-y border-ink-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 md:grid-cols-4 md:gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0">
                <f.icon size={18} className="text-ink-700" />
              </div>
              <div>
                <p className="font-semibold text-sm text-ink-900">{f.title}</p>
                <p className="text-xs text-ink-400 mt-0.5">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarqueeBanner() {
  const items = ['New Arrivals', 'Free Shipping Over PKR 999', 'Premium Quality', 'Curated Selection', 'Secure Payments', 'Easy Returns'];
  return (
    <div className="bg-ink-950 text-gold-400 py-3 overflow-hidden">
      <motion.div
        animate={{ x: [0, -1200] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="flex items-center gap-8 whitespace-nowrap"
      >
        {[...items, ...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-4 text-xs font-medium tracking-widest uppercase">
            {item}
            <span className="w-1 h-1 rounded-full bg-gold-500" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function FeaturedProducts({ products, loading }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mb-8 flex items-end justify-between sm:mb-10">
        <div>
          <span className="text-xs text-gold-600 font-medium tracking-widest uppercase">Hand-picked</span>
          <h2 className="section-title mt-1">Featured Products</h2>
        </div>
        <Link to="/products?featured=true" className="hidden sm:flex items-center gap-1 text-sm text-ink-600 hover:text-ink-950 font-medium transition-colors">
          See All <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {loading
          ? Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
          : products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)
        }
      </div>
    </section>
  );
}

function CategoryProductRows({ sections, loading }) {
  const skeletonRows = Array(4).fill(0);

  return (
    <section className="border-y border-ink-100 bg-ink-50 py-14 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <span className="text-xs text-gold-600 font-medium tracking-widest uppercase">Fresh catalog</span>
            <h2 className="section-title mt-1">New Arrivals by Category</h2>
            <p className="text-sm text-ink-500 mt-3 max-w-2xl">
              Shop the latest drops across every Shumara department, grouped into focused rows so each category is easy to scan.
            </p>
          </div>
          <Link to="/products?sort=newest" className="btn-outline w-fit">
            Browse Newest <ArrowRight size={16} />
          </Link>
        </div>

        <div className="space-y-14">
          {loading && skeletonRows.map((_, row) => (
            <div key={row}>
              <div className="h-8 bg-ink-100 rounded-xl w-56 mb-5 animate-pulse" />
              <div className="flex gap-5 overflow-hidden">
                {Array(4).fill(0).map((__, i) => (
                  <div key={i} className="min-w-[185px] min-[420px]:min-w-[220px] sm:min-w-[270px]">
                    <ProductCardSkeleton />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {!loading && sections.map((section, rowIndex) => (
            <motion.div
              key={section.category.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45 }}
            >
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <span className="text-xs text-ink-400 font-medium tracking-widest uppercase">
                    {rowIndex === 0 ? 'Latest edit' : `${section.total} products`}
                  </span>
                  <h3 className="font-display text-2xl md:text-3xl font-semibold text-ink-950 mt-1">
                    {section.category.name}
                  </h3>
                </div>
                <Link
                  to={`/products?category=${section.category.slug}`}
                  className="hidden sm:flex items-center gap-1 text-sm text-ink-600 hover:text-ink-950 font-medium transition-colors"
                >
                  Shop Row <ArrowRight size={15} />
                </Link>
              </div>

              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 sm:gap-5 scrollbar-hide">
                {section.products.map((product, i) => (
                  <div key={product.id} className="min-w-[185px] snap-start min-[420px]:min-w-[220px] sm:min-w-[270px] lg:min-w-[285px]">
                    <ProductCard product={product} index={Math.min(i, 3)} />
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { data: featured = [], isLoading: loadingFeatured } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const { data } = await api.get('/products/featured');
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: sections = [], isLoading: loadingSections } = useQuery({
    queryKey: ['products', 'home-sections', HOME_SECTION_PRODUCT_LIMIT, HOME_SECTION_CATEGORY_LIMIT],
    queryFn: async () => {
      const { data } = await api.get(`/products/home-sections?limit=${HOME_SECTION_PRODUCT_LIMIT}&categoryLimit=${HOME_SECTION_CATEGORY_LIMIT}`);
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div>
      <HeroSection />
      <MarqueeBanner />
      <CategorySection sections={sections} />
      <FeaturesBar />
      <FeaturedProducts products={featured} loading={loadingFeatured} />
      <CategoryProductRows sections={sections} loading={loadingSections} />

      <section className="mx-4 my-14 sm:mx-6 sm:my-20 lg:mx-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl">
            <img
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400&auto=format&q=80"
              alt="sale"
              className="h-80 w-full object-cover md:h-96"
            />
            <div className="absolute inset-0 flex items-center bg-gradient-to-r from-ink-950/85 via-ink-950/45 to-transparent">
              <div className="max-w-lg px-6 sm:px-10 md:px-16">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="text-gold-400 text-xs font-medium tracking-widest uppercase">Limited Time</span>
                  <h2 className="mt-2 mb-4 font-display text-3xl font-semibold text-white sm:text-4xl md:text-5xl">
                    Up to 40% off<br />selected styles
                  </h2>
                  <Link to="/products?sort=price-asc" className="btn-primary bg-white text-ink-950 hover:bg-ink-100">
                    Shop the Sale
                    <ArrowRight size={16} />
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
