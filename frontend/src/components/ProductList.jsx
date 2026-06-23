import ProductCard from './ProductCard';

function ProductList({ products, hasMore, onLoadMore, loading }) {
  if (products.length === 0 && !loading) {
    return (
      <div style={{ padding: '40px 20px', color: '#555', textAlign: 'center' }}>
        No products found.
      </div>
    );
  }

  return (
    <div>
      <div style={{ border: '1px solid #222', borderRadius: '6px', overflow: 'hidden' }}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={onLoadMore}
            disabled={loading}
            style={{
              background: 'transparent',
              color: loading ? '#444' : '#aaa',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '9px 28px',
            }}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

export default ProductList;
