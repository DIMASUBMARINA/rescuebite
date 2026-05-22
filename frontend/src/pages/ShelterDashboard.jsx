import { useState, useEffect } from 'react';
import { shelterAPI } from '../services/api';

function ShelterDashboard() {
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDonations();
    loadMyClaims();
  }, []);

  const loadDonations = async () => {
    try {
      const res = await shelterAPI.availableDonations();
      setItems(res.data.data);
    } catch (err) {
      setError('Failed to load donations');
    }
  };

  const loadMyClaims = async () => {
    try {
      const res = await shelterAPI.myClaims();
      setClaims(res.data.data);
    } catch (err) {
      console.error('Failed to load claims');
    }
  };

  const handleClaim = async (inventoryId) => {
    try {
      await shelterAPI.claim({ inventoryId });
      alert('Donation claimed! A driver will deliver it.');
      loadDonations();
      loadMyClaims();
    } catch (err) {
      alert(err.response?.data?.message || 'Claim failed');
    }
  };

  const handleConfirmReceipt = async (claimId) => {
    try {
      await shelterAPI.confirmReceipt(claimId);
      alert('Receipt confirmed! Thank you.');
      loadMyClaims();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm receipt');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      UNASSIGNED: 'badge-expired',
      ASSIGNED: 'badge-discounted',
      IN_TRANSIT: 'badge-free',
      DELIVERED: 'badge-fresh',
      COMPLETED: 'badge-fresh',
      CANCELLED: 'badge-expired',
    };
    return colors[status] || 'badge-discounted';
  };

  const getClaimStatus = (claim) => {
    if (claim.pickup?.status === 'COMPLETED') return '✅ Completed';
    if (claim.pickup?.status === 'DELIVERED') return '📦 Delivered - Confirm Receipt';
    if (claim.pickup?.status === 'IN_TRANSIT') return '🚚 In Transit';
    if (claim.pickup?.status === 'ASSIGNED') return '👤 Driver Assigned';
    return '⏳ Waiting for Driver';
  };

  return (
    <div>
      <h2>Shelter Dashboard</h2>
      {error && <div className="error">{error}</div>}
      
      <h3>My Claims</h3>
      <div className="grid">
        {claims.length === 0 ? (
          <p style={{ color: '#666' }}>No claims yet. Claim free food below!</p>
        ) : (
          claims.map(claim => (
            <div key={claim.id} className="card">
              <h4>{claim.inventory?.name}</h4>
              <p><strong>Restaurant:</strong> {claim.inventory?.restaurant?.businessName}</p>
              <p><strong>Address:</strong> {claim.inventory?.restaurant?.address}</p>
              <p>
                <span className={`badge ${getStatusBadge(claim.pickup?.status)}`}>
                  {claim.pickup?.status || 'UNASSIGNED'}
                </span>
              </p>
              <p><strong>Status:</strong> {getClaimStatus(claim)}</p>
              <p><strong>Claimed:</strong> {new Date(claim.claimedAt).toLocaleString()}</p>
              <p><strong>Expires:</strong> {new Date(claim.expiresAt).toLocaleString()}</p>
              
              {claim.pickup?.status === 'DELIVERED' && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleConfirmReceipt(claim.id)}
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  ✅ Confirm Receipt
                </button>
              )}
              
              {claim.pickup?.status === 'COMPLETED' && (
                <p style={{ color: '#28a745', marginTop: '10px' }}>
                  ✅ Food received! Thank you!
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <h3>Available Donations Near You</h3>
      <div className="grid">
        {items.length === 0 ? (
          <p style={{ color: '#666' }}>No donations available right now.</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="card">
              <h4>{item.name}</h4>
              <p>{item.description}</p>
              <p><strong>Restaurant:</strong> {item.restaurant?.businessName}</p>
              <p><strong>Distance:</strong> {item.distance_km?.toFixed(2)} km</p>
              <p><strong>Expires:</strong> {new Date(item.expiresAt).toLocaleString()}</p>
              <p><strong>Allergens:</strong> {item.allergens?.join(', ') || 'None'}</p>
              <p><strong>Available:</strong> {item.quantity - item.reservedQty} / {item.quantity}</p>
              <button 
                className="btn btn-primary" 
                onClick={() => handleClaim(item.id)}
                disabled={item.quantity <= item.reservedQty}
                style={{ width: '100%', marginTop: '10px' }}
              >
                Claim Free Food
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ShelterDashboard;