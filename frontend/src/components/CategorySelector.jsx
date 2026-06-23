const CATEGORIES = [
  'Electronics',
  'Books',
  'Fashion',
  'Home',
  'Sports',
  'Beauty',
  'Toys',
  'Automotive',
];

function CategorySelector({ selected, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <label
        htmlFor="category"
        style={{ color: '#888', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em' }}
      >
        Category
      </label>
      <select
        id="category"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: '#1a1a1a',
          color: '#e0e0e0',
          border: '1px solid #333',
          borderRadius: '4px',
          padding: '6px 12px',
          fontSize: '14px',
          outline: 'none',
        }}
      >
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
    </div>
  );
}

export default CategorySelector;
