import { useState, useEffect } from 'react';
import { driverAPI } from '../services/api';

function DriverDashboard() {
  const [availablePickups, setAvailablePickups] = useState([]);
  const [myPickups, setMyPickups] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPickups();
  }, []);
  

  const loadPickups = async () => {
    try {
      const availableRes = await driverAPI.availablePickups();
      setAvailablePickups(availableRes.data.data);
      
      const myRes = await driverAPI.myPickups(); 
      setMyPickups(myRes.data.data);
    } catch (err) {
      setError('Failed to load pickups');
    }
  };

  const handleClaim = async (pickupId) => {
    try {
      const res = await driverAPI.claimPickup(pickupId);
      alert(`Pickup claimed! Must pick up by ${new Date(res.data.mustPickUpBy).toLocaleTimeString()}`);
      loadPickups();
    } catch (err) {
      alert(err.response?.data?.message || 'Claim failed');
    }
  };

  const handleMarkPickedUp = async (pickupId) => {
    try {
      await driverAPI.markPickedUp(pickupId);
      alert('Marked as picked up! Now delivering...');
      loadPickups();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const handleMarkDelivered = async (pickupId) => {
    try {
      await driverAPI.markDelivered(pickupId);
      alert('Delivery complete! Shelter can now confirm receipt.');
      loadPickups();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const getPickupInfo = (pickup) => {
    if (pickup.type === 'SHELTER_DELIVERY') {
      return {
        from: pickup.claim?.inventory?.restaurant?.businessName,
        fromAddress: pickup.claim?.inventory?.restaurant?.address,
        to: pickup.claim?.shelter?.shelterName,
        toAddress: pickup.claim?.shelter?.address,
        item: pickup.claim?.inventory?.name,
      };
    } else {
      return {
        from: pickup.order?.inventory?.restaurant?.businessName,
        fromAddress: pickup.order?.inventory?.restaurant?.address,
        to: pickup.order?.user?.email,
        toAddress: pickup.order?.deliveryAddress,
        item: pickup.order?.inventory?.name,
      };
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      UNASSIGNED: 'badge-expired',
      ASSIGNED: 'badge-discounted',
      IN_TRANSIT: 'badge-free',
      DELIVERED: 'badge-fresh',
      COMPLETED: 'badge-fresh',
    };
    return colors[status] || 'badge-discounted';
  };

  return (
    <div>
      <h2>Driver Dashboard</h2>
      {error && <div className="error">{error}</div>}

      {/* My Active Pickups */}
      <h3>My Active Deliveries</h3>
      <div className="grid">
        {myPickups.length === 0 ? (
          <p style={{ color: '#666' }}>No active deliveries. Claim one below!</p>
        ) : (
          myPickups.map(pickup => {
            const info = getPickupInfo(pickup);
            return (
              <div key={pickup.id} className="card">
                <h4>{info.item}</h4>
                <p>
                  <span className={`badge ${getStatusBadge(pickup.status)}`}>
                    {pickup.status}
                  </span>
                </p>
                <p><strong>From:</strong> {info.from}</p>
                <p>{info.fromAddress}</p>
                <p><strong>To:</strong> {info.to}</p>
                <p>{info.toAddress}</p>
                <p><strong>Type:</strong> {pickup.type === 'SHELTER_DELIVERY' ? '🏠 Shelter Delivery' : '🏠 Consumer Delivery'}</p>
                
                {pickup.status === 'ASSIGNED' && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleMarkPickedUp(pickup.id)}
                    style={{ width: '100%', marginTop: '10px' }}
                  >
                    📦 Mark Picked Up
                  </button>
                )}
                
                {pickup.status === 'IN_TRANSIT' && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleMarkDelivered(pickup.id)}
                    style={{ width: '100%', marginTop: '10px' }}
                  >
                    ✅ Mark Delivered
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Available Pickups */}
      <h3>Available Pickups</h3>
      <div className="grid">
        {availablePickups.filter(p => p.status === 'UNASSIGNED').length === 0 ? (
          <p style={{ color: '#666' }}>No available pickups right now.</p>
        ) : (
          availablePickups.filter(p => p.status === 'UNASSIGNED').map(pickup => {
            const info = getPickupInfo(pickup);
            return (
              <div key={pickup.id} className="card">
                <h4>{info.item}</h4>
                <p><strong>From:</strong> {info.from}</p>
                <p>{info.fromAddress}</p>
                <p><strong>To:</strong> {info.to}</p>
                <p>{info.toAddress}</p>
                <p><strong>Type:</strong> {pickup.type === 'SHELTER_DELIVERY' ? '🏠 Shelter' : '🏠 Consumer'}</p>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleClaim(pickup.id)}
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  Claim Pickup
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default DriverDashboard;