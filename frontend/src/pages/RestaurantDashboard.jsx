import { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';

function RestaurantDashboard() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    originalPrice: '',
    quantity: 1,
    expiresAt: '',
    ingredients: '',
    allergens: [],
  });

  useEffect(() => {
    loadMyDishes();
  }, []);

  const loadMyDishes = async () => {
    try {
      const res = await inventoryAPI.myDishes();
      setItems(res.data.data);
    } catch (err) {
      console.error('Failed to load dishes');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        originalPrice: parseFloat(form.originalPrice),
        quantity: parseInt(form.quantity),
        ingredients: form.ingredients ? JSON.parse(form.ingredients) : {},
        allergens: form.allergens,
      };
      
      await inventoryAPI.create(data);
      alert('Item created!');
      setForm({
        name: '',
        description: '',
        originalPrice: '',
        quantity: 1,
        expiresAt: '',
        ingredients: '',
        allergens: [],
      });
      loadMyDishes();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create item');
    }
  };

  return (
    <div>
      <h2>Restaurant Dashboard</h2>
      
      <div className="card">
        <h3>Create New Item</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Original Price (KZT)</label>
            <input type="number" value={form.originalPrice} onChange={(e) => setForm({...form, originalPrice: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input type="number" value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Expires At</label>
            <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({...form, expiresAt: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Ingredients (JSON)</label>
            <textarea value={form.ingredients} onChange={(e) => setForm({...form, ingredients: e.target.value})} placeholder='{"flour": "wheat"}' />
          </div>
          <button type="submit" className="btn btn-primary">Create Item</button>
        </form>
      </div>

      <h3>My Dishes</h3>
      <div className="grid">
        {items.map(item => (
          <div key={item.id} className="card">
            <h4>{item.name}</h4>
            <p>
              <span className={`badge badge-${item.state.toLowerCase()}`}>{item.state}</span>
            </p>
            <p><strong>Price:</strong> {item.currentPrice} KZT</p>
            <p><strong>Quantity:</strong> {item.quantity - item.reservedQty} available</p>
            <p><strong>Expires:</strong> {new Date(item.expiresAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RestaurantDashboard;