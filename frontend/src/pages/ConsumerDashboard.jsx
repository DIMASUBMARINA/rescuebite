import { useState, useEffect } from 'react';
import { inventoryAPI, orderAPI } from '../services/api';
import AllergyManager from "../components/AllergyManager/AllergyManager";

function ConsumerDashboard() {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState({});

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
      const initial = {};
      purchasableItems.forEach(i => initial[i.id] = 1);
      setQuantities(initial);
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
    setError('');
    try {
      const qty = quantities[item.id] || 1;
      const orderData = {
        inventoryId: item.id,
        quantity: qty,
        ...(withDelivery && {
          deliveryAddress: 'Tole Bi Street 100, Almaty',
          deliveryLat: 43.25,
          deliveryLon: 76.91,
        }),
      };
      await orderAPI.create(orderData);
      alert(`Ordered ${qty} x ${item.name}`);
      loadItems();
      loadMyOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Order failed');
    } finally {
      setLoading(false);
    }
  };

    const loadAllergies = async () => {
    try {
      const res = await userAPI.getAllergies();
      setAllergies(res.data.data);
    } catch (err) {
      console.error('Failed to load allergies');
    }
  };

  const hasAllergenConflict = (item) => {
  return item.allergens?.some(a => allergies.includes(a));
};


  const handlePay = async (orderId) => {
    try {
      await orderAPI.pay(orderId);
      alert('Payment successful!');
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
      <AllergyManager />
      {error && <div className="error">{error}</div>}
      
      <h3>Available Items</h3>
      <div className="grid">
        {items.map(item => {
          const qty = quantities[item.id] || 1;
          const total = (item.currentPrice * qty).toFixed(0);
          
          return (
            <div key={item.id} className="card">
              <h4>{item.name}</h4>
              <p>{item.description}</p>
                          {hasAllergenConflict(item) && (
              <div style={{ 
                background: '#fff3cd', 
                padding: '8px', 
                borderRadius: '4px',
                marginTop: '10px',
                marginBottom: '10px',
                color: '#856404',
                fontSize: '13px'
              }}>
                ⚠️ Contains your allergens: {item.allergens.filter(a => allergies.includes(a)).join(', ')}
              </div>
            )}
            
              <p>
                <span className={`badge ${getStatusBadge(item.state)}`}>{item.state}</span>
              </p>
              <p><strong>Price:</strong> {item.currentPrice} KZT</p>
              <p><strong>Stock:</strong> {item.quantity - item.reservedQty} left</p>

              
              <div className="quantity-row">
                <label>Qty: </label>
                <select 
                  value={qty}
                  onChange={(e) => setQuantities({...quantities, [item.id]: parseInt(e.target.value)})}
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span> = {total} KZT</span>
              </div>
              
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
          );
        })}
      </div>

      <div>
        <h2>Consumer Dashboard</h2>
        
        <AllergyManager /> 
        
      </div>

      <h3>My Orders</h3>
      <div className="grid">
        {orders.map(order => (
          <div key={order.id} className="card">
            <p><strong>{order.inventory?.name}</strong></p>
            <p><span className={`badge ${getStatusBadge(order.status)}`}>{order.status}</span></p>
            <p><strong>Qty:</strong> {order.quantity || 1}</p>
            <p><strong>Total:</strong> {order.totalPrice} KZT</p>
            {order.deliveryFee && <p><strong>Delivery:</strong> {order.deliveryFee} KZT</p>}
            
            {order.status === 'PENDING' && (
              <button className="btn btn-primary" onClick={() => handlePay(order.id)}>
                Pay Now
              </button>
            )}
            {order.status === 'READY_FOR_PICKUP' && !order.isDelivery && (
              <button className="btn btn-primary" onClick={() => handleMarkPickedUp(order.id)}>
                I Picked Up
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConsumerDashboard;