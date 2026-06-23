function ProductCard({ product }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto auto',
      alignItems: 'center',
      gap: '16px',
      padding: '14px 20px',
      borderBottom: '1px solid #222',
    }}>
      <div>
        <div style={{ color: '#e0e0e0', fontWeight: '500' }}>
          {product.name}
        </div>
        <div style={{ color: '#555', fontSize: '13px', marginTop: '2px' }}>
          {product.category}
        </div>
      </div>

      <div style={{ color: '#aaa', fontSize: '13px' }}>
        #{product.id}
      </div>

      <div style={{ color: '#e0e0e0', fontWeight: '600', minWidth: '70px', textAlign: 'right' }}>
        ${parseFloat(product.price).toFixed(2)}
      </div>
    </div>
  );
}

export default ProductCard;
