import { useState, useEffect } from 'react';
import CategorySelector from './components/CategorySelector';
import ProductList from './components/ProductList';
import { fetchProducts } from './api/products';

function App() {
  const [category, setCategory] = useState('Electronics');
  const [products, setProducts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  // Fetch the first page whenever category changes
  useEffect(() => {
    setProducts([]);
    setCursor(null);
    setHasMore(false);
    setTotal(0);
    fetchPage(null, category, true);
  }, [category]);

  async function fetchPage(cursorValue, cat, isFirstPage = false) {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchProducts(cat, cursorValue);
      setProducts((prev) => isFirstPage ? data.products : [...prev, ...data.products]);
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
      setTotal((prev) => isFirstPage ? data.products.length : prev + data.products.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCategoryChange(newCategory) {
    setCategory(newCategory);
  }

  function handleLoadMore() {
    fetchPage(cursor, category, false);
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 20px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
          Products
        </h1>
        <p style={{ color: '#555', fontSize: '13px' }}>
          Browsing ~200,000 products with cursor pagination
        </p>
      </div>

      {/* Controls */}
      <div style={{ marginBottom: '24px' }}>
        <CategorySelector selected={category} onChange={handleCategoryChange} />
      </div>

      {/* Result count */}
      {!loading && products.length > 0 && (
        <div style={{ color: '#555', fontSize: '13px', marginBottom: '12px' }}>
          Showing {total} product{total !== 1 ? 's' : ''}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ color: '#c0392b', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Initial loading */}
      {loading && products.length === 0 && (
        <div style={{ color: '#555', padding: '40px 0', textAlign: 'center', fontSize: '13px' }}>
          Loading...
        </div>
      )}

      {/* Product list */}
      <ProductList
        products={products}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        loading={loading}
      />

    </div>
  );
}

export default App;
