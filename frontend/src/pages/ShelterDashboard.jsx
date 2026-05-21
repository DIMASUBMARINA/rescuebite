import { useState, useEffect } from 'react';
import { shelterAPI } from '../services/api';

function ShelterDashboard() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDonations();
  }, []);

  const loadDonations = async () => {
    try {
      const res = await shelterAPI.availableDonations();
      setItems(res.data.data);
    } catch (err) {
      setError('Failed to load donations');
    }
  };

  const handleClaim = async (inventoryId) => {
    try {
      await shelterAPI.claim({ inventoryId });
      alert('Donation claimed! A driver will deliver it.');
      loadDonations();
    } catch (err) {
      alert(err.response?.data?.message || 'Claim failed');
    }
  };

  return (
    <div>
      <h2>Shelter Dashboard</h2>
      {error && <div className="error">{error}</div>}
      
      <h3>Available Donations Near You</h3>
      <div className="grid">
        {items.map(item => (
          <div key={item.id} className="card">
            <h4>{item.name}</h4>
            <p>{item.description}</p>
            <p><strong>Restaurant:</strong> {item.restaurant_name}</p>
            <p><strong>Distance:</strong> {item.distance_km?.toFixed(2)} km</p>
            <p><strong>Expires:</strong> {new Date(item.expires_at).toLocaleString()}</p>
            <p><strong>Allergens:</strong> {item.allergens?.join(', ') || 'None'}</p>
            <button 
              className="btn btn-primary" 
              onClick={() => handleClaim(item.id)}
              style={{ width: '100%', marginTop: '10px' }}
            >
              Claim Free Food
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ShelterDashboard;