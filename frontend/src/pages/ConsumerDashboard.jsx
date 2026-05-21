import { useState, useEffect } from 'react';
import { inventoryAPI, orderAPI } from '../services/api';

function ConsumerDashboard() {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadItems();
    loadMyOrders();
  }, []);

  const loadItems = async () => {
    try {
      const res = await inventoryAPI.list({});
      const purchasableItems = res.data.data.filter(item => 
        ['FRESH', 'DISCOUNTED'].includes(item.state)
      );
      setItems(purchasableItems);
    } catch (err) {
      setError('Failed to load items');
    }
  };

  const loadMyOrders = async () => {
    try {
      const res = await orderAPI.listByConsumer();
      setOrders(res.data.data);
    } catch (err) {
      console.error('Failed to load orders');
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
      
      await orderAPI.create(orderData);
      alert('Order created! Status: PENDING. Please pay to confirm.');
      loadItems();
      loadMyOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (orderId) => {
    try {
      await orderAPI.pay(orderId);
      alert('Payment successful! Status: PAID. Waiting for restaurant confirmation.');
      loadMyOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Payment failed');
    }
  };

  const handleMarkPickedUp = async (orderId) => {
    try {
      await orderAPI.markPickedUpByConsumer(orderId);
      alert('Enjoy your meal!');
      loadMyOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
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
      <h2>Consumer Dashboard</h2>
      {error && <div className="error">{error}</div>}
      
      <h3>Available Items</h3>
      <div className="grid">
        {items.map(item => (
          <div key={item.id} className="card">
            <h4>{item.name}</h4>
            <p>{item.description}</p>
            <p>
              <span className={`badge ${getStatusBadge(item.state)}`}>{item.state}</span>
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
                Order Pickup
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleOrder(item, true)}
                disabled={loading}
              >
                Order Delivery
              </button>
            </div>
          </div>
        ))}
      </div>

      <h3>My Orders</h3>
      <div className="grid">
        {orders.map(order => (
          <div key={order.id} className="card">
            <p><strong>{order.inventory?.name}</strong></p>
            <p>
              <span className={`badge ${getStatusBadge(order.status)}`}>{order.status}</span>
            </p>
            <p><strong>Total:</strong> {order.totalPrice} KZT</p>
            {order.deliveryFee && <p><strong>Delivery:</strong> {order.deliveryFee} KZT</p>}
            <p><strong>Created:</strong> {new Date(order.createdAt).toLocaleString()}</p>
            
            {order.status === 'PENDING' && (
              <button 
                className="btn btn-primary" 
                onClick={() => handlePay(order.id)}
                style={{ width: '100%', marginTop: '10px' }}
              >
                Pay Now
              </button>
            )}
            
            {order.status === 'PAID' && (
              <p style={{ marginTop: '10px', color: '#666' }}>
                ⏳ Waiting for restaurant confirmation...
              </p>
            )}
            
            {order.status === 'CONFIRMED' && (
              <p style={{ marginTop: '10px', color: '#666' }}>
                👨‍🍳 Restaurant is preparing your order...
              </p>
            )}
            
            {order.status === 'READY_FOR_PICKUP' && !order.isDelivery && (
              <button 
                className="btn btn-primary" 
                onClick={() => handleMarkPickedUp(order.id)}
                style={{ width: '100%', marginTop: '10px' }}
              >
                I Picked Up My Order
              </button>
            )}
            
            {order.status === 'READY_FOR_PICKUP' && order.isDelivery && (
              <p style={{ marginTop: '10px', color: '#28a745' }}>
                🚚 Your delivery is on the way!
              </p>
            )}
            
            {order.status === 'DELIVERED' && (
              <p style={{ marginTop: '10px', color: '#28a745' }}>
                ✅ Delivered! Enjoy your meal!
              </p>
            )}
            
            {order.status === 'COMPLETED' && (
              <p style={{ marginTop: '10px', color: '#28a745' }}>
                ✅ Completed! Enjoy your meal!
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConsumerDashboard;