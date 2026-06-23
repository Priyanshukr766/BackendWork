const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchProducts(category, cursor = null) {
  const url = cursor
    ? `${API_BASE}/products?category=${category}&cursor=${cursor}`
    : `${API_BASE}/products?category=${category}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }

  return res.json(); // { products, next_cursor, has_more }
}
