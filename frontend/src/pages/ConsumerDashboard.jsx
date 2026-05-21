import { useState, useEffect } from 'react';
import { inventoryAPI, orderAPI } from '../services/api';

function ConsumerDashboard() {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const res = await inventoryAPI.list({}); // No state filter
      // Filter to only show purchasable items
      const purchasableItems = res.data.data.filter(item => 
        ['FRESH', 'DISCOUNTED'].includes(item.state)
      );
      setItems(purchasableItems);
    } catch (err) {
      setError('Failed to load items');
    }
  };

  const handleOrder = async (item, withDelivery = false) => {
    setLoading(true);
    try {
      const orderData = {
        inventoryId: item.id,
        ...(withDelivery && {
          deliveryAddress: 'Tole Bi Street 100, Almaty',
          deliveryLat: 43.25,
          deliveryLon: 76.91,
        }),
      };
      
      const res = await orderAPI.create(orderData);
      const order = res.data.data;
      
      // Auto-pay for demo
      await orderAPI.pay(order.id);
      
      alert(`Order placed! ${withDelivery ? 'Delivery fee: ' + res.data.deliveryFee + ' KZT' : 'Pickup at restaurant'}`);
      loadItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Consumer Dashboard</h2>
      {error && <div className="error">{error}</div>}
      
      <h3>Available Items</h3>
      <div className="grid">
        {items.map(item => (
          <div key={item.id} className="card">
            <h4>{item.name}</h4>
            <p>{item.description}</p>
            <p>
              <span className={`badge badge-${item.state.toLowerCase()}`}>{item.state}</span>
            </p>
            <p><strong>Price:</strong> {item.currentPrice} KZT</p>
            <p><strong>Original:</strong> {item.originalPrice} KZT</p>
            <p><strong>Expires:</strong> {new Date(item.expiresAt).toLocaleString()}</p>
            <p><strong>Allergens:</strong> {item.allergens?.join(', ') || 'None'}</p>
            
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => handleOrder(item, false)}
                disabled={loading}
              >
                Pickup
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleOrder(item, true)}
                disabled={loading}
              >
                Delivery (+fee)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConsumerDashboard;