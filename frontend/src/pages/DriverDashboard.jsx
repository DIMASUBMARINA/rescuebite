import { useState, useEffect } from 'react';
import { driverAPI } from '../services/api';

function DriverDashboard() {
  const [pickups, setPickups] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPickups();
    const interval = setInterval(loadPickups, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadPickups = async () => {
    try {
      const res = await driverAPI.availablePickups();
      setPickups(res.data.data);
    } catch (err) {
      setError('Failed to load pickups');
    }
  };

  const handleClaim = async (pickupId) => {
    try {
      await driverAPI.claimPickup(pickupId);
      alert('Pickup claimed! You have 15 minutes.');
      loadPickups();
    } catch (err) {
      alert(err.response?.data?.message || 'Claim failed');
    }
  };

  const handleMarkPickedUp = async (pickupId) => {
    try {
      await driverAPI.markPickedUp(pickupId);
      alert('Marked as picked up!');
      loadPickups();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const handleMarkDelivered = async (pickupId) => {
    try {
      await driverAPI.markDelivered(pickupId);
      alert('Marked as delivered!');
      loadPickups();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const getStatusActions = (pickup) => {
    switch (pickup.status) {
      case 'UNASSIGNED':
        return (
          <button className="btn btn-primary" onClick={() => handleClaim(pickup.id)}>
            Claim Pickup
          </button>
        );
      case 'ASSIGNED':
        return (
          <button className="btn btn-secondary" onClick={() => handleMarkPickedUp(pickup.id)}>
            Mark Picked Up
          </button>
        );
      case 'IN_TRANSIT':
        return (
          <button className="btn btn-primary" onClick={() => handleMarkDelivered(pickup.id)}>
            Mark Delivered
          </button>
        );
      default:
        return <span>Completed</span>;
    }
  };

  return (
    <div>
      <h2>Driver Dashboard</h2>
      {error && <div className="error">{error}</div>}
      
      <h3>Available Pickups</h3>
      <div className="grid">
        {pickups.map(pickup => (
          <div key={pickup.id} className="card">
            <p><strong>Type:</strong> {pickup.type === 'CONSUMER_DELIVERY' ? 'Consumer Delivery' : 'Shelter Donation'}</p>
            <p><strong>Status:</strong> {pickup.status}</p>
            
            {pickup.claim?.inventory?.restaurant && (
              <div>
                <p><strong>From:</strong> {pickup.claim.inventory.restaurant.businessName}</p>
                <p>{pickup.claim.inventory.restaurant.address}</p>
              </div>
            )}
            
            {pickup.order?.user && (
              <div>
                <p><strong>To Consumer:</strong> {pickup.order.user.email}</p>
                <p>{pickup.order.deliveryAddress}</p>
              </div>
            )}
            
            {pickup.claim?.shelter && (
              <div>
                <p><strong>To Shelter:</strong> {pickup.claim.shelter.shelterName}</p>
              </div>
            )}
            
            <div style={{ marginTop: '10px' }}>
              {getStatusActions(pickup)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DriverDashboard;