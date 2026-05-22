import { useState, useEffect } from 'react';
import { inventoryAPI, orderAPI } from '../services/api';

function RestaurantDashboard() {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
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
    loadMyOrders();
  }, []);

  const ALLERGEN_OPTIONS = [
    'GLUTEN', 'DAIRY', 'EGGS', 'FISH', 'SHELLFISH',
    'TREE_NUTS', 'PEANUTS', 'WHEAT', 'SOY', 'SESAME'
  ];

  const loadMyDishes = async () => {
    try {
      const res = await inventoryAPI.myDishes();
      setItems(res.data.data);
    } catch (err) {
      console.error('Failed to load dishes');
    }
  };

  const loadMyOrders = async () => {
    try {
      const res = await orderAPI.listByRestaurant();
      setOrders(res.data.data);
    } catch (err) {
      console.error('Failed to load orders');
    }
  };

    const toggleAllergen = (allergen) => {
    setForm(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: form.name,
        description: form.description,
        originalPrice: parseFloat(form.originalPrice),
        quantity: parseInt(form.quantity),
        expiresAt: form.expiresAt,
        ingredients: form.ingredients ? form.ingredients.split(',').map(i => i.trim()) : [],
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

  const handleConfirmOrder = async (orderId) => {
    try {
      await orderAPI.confirmByRestaurant(orderId);
      alert('Order confirmed!');
      loadMyOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm');
    }
  };

  const handleMarkReady = async (orderId) => {
    try {
      await orderAPI.markReady(orderId);
      alert('Order marked ready for pickup!');
      loadMyOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark ready');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: 'badge-discounted',
      PAID: 'badge-free',
      CONFIRMED: 'badge-fresh',
      READY_FOR_PICKUP: 'badge-fresh',
      DELIVERED: 'badge-fresh',
      COMPLETED: 'badge-fresh',
      CANCELLED: 'badge-expired',
    };
    return colors[status] || 'badge-discounted';
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
            <label>Ingredients (comma-separated)</label>
            <input 
              value={form.ingredients} 
              onChange={(e) => setForm({...form, ingredients: e.target.value})} 
              placeholder="flour, eggs, milk, sugar"
            />
          </div>
          
          {/* ADD THIS ALLERGEN SECTION */}
          <div className="form-group">
            <label>Allergens (select all that apply)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {ALLERGEN_OPTIONS.map(allergen => (
                <label key={allergen} style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: `2px solid ${form.allergens.includes(allergen) ? '#dc3545' : '#ddd'}`,
                  background: form.allergens.includes(allergen) ? '#fff5f5' : 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: form.allergens.includes(allergen) ? 'bold' : 'normal',
                  color: form.allergens.includes(allergen) ? '#dc3545' : '#333',
                }}>
                  <input
                    type="checkbox"
                    checked={form.allergens.includes(allergen)}
                    onChange={() => toggleAllergen(allergen)}
                    style={{ display: 'none' }}
                  />
                  {form.allergens.includes(allergen) ? '✓ ' : ''}{allergen}
                </label>
              ))}
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ marginTop: '15px' }}>Create Item</button>
        </form>
      </div>

      <h3>Incoming Orders</h3>
      <div className="grid">
        {orders.map(order => (
          <div key={order.id} className="card">
            <p><strong>Item:</strong> {order.inventory?.name}</p>
            <p><strong>Customer:</strong> {order.user?.email}</p>
            <p><strong>Phone:</strong> {order.user?.phone || 'N/A'}</p>
            <p>
              <span className={`badge ${getStatusBadge(order.status)}`}>{order.status}</span>
            </p>
            <p><strong>Total:</strong> {order.totalPrice} KZT</p>
            {order.deliveryFee && <p><strong>Delivery:</strong> {order.deliveryFee} KZT</p>}
            <p><strong>Type:</strong> {order.isDelivery ? '🚚 Delivery' : '🏃 Pickup'}</p>
            
            {order.status === 'PAID' && (
              <button 
                className="btn btn-primary" 
                onClick={() => handleConfirmOrder(order.id)}
                style={{ width: '100%', marginTop: '10px' }}
              >
                ✅ Confirm Order
              </button>
            )}
            
            {order.status === 'CONFIRMED' && (
              <button 
                className="btn btn-secondary" 
                onClick={() => handleMarkReady(order.id)}
                style={{ width: '100%', marginTop: '10px' }}
              >
                📦 Mark Ready for Pickup
              </button>
            )}
            
            {order.status === 'READY_FOR_PICKUP' && (
              <p style={{ marginTop: '10px', color: '#28a745' }}>
                ⏳ Waiting for customer/driver...
              </p>
            )}
            
            {order.status === 'DELIVERED' && (
              <p style={{ marginTop: '10px', color: '#28a745' }}>
                ✅ Delivered
              </p>
            )}
            
            {order.status === 'COMPLETED' && (
              <p style={{ marginTop: '10px', color: '#28a745' }}>
                ✅ Completed
              </p>
            )}
          </div>
        ))}
      </div>

      <h3>My Dishes</h3>
      <div className="grid">
        {items.map(item => (
          <div key={item.id} className="card">
            <h4>{item.name}</h4>
            <p>
              <span className={`badge ${getStatusBadge(item.state)}`}>{item.state}</span>
            </p>
            <p><strong>Price:</strong> {item.currentPrice} KZT</p>
            <p><strong>Available:</strong> {item.quantity - item.reservedQty} / {item.quantity}</p>
            <p><strong>Expires:</strong> {new Date(item.expiresAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RestaurantDashboard;