import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileAPI } from '../services/api';
import VerificationUpload from '../components/VerificationUpload/VerificationUpload';

function CreateProfile() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [createdProfile, setCreatedProfile] = useState(null);
  const [showVerification, setShowVerification] = useState(false);

  const [restaurantForm, setRestaurantForm] = useState({
    businessName: '',
    address: '',
    lat: 43.238,
    lon: 76.8829,
  });

  const [shelterForm, setShelterForm] = useState({
    shelterName: '',
    charityRegNo: '',
    address: '',
    lat: 43.2567,
    lon: 76.9286,
  });

  const [driverForm, setDriverForm] = useState({
    licenseNo: '',
    vehiclePlate: '',
  });

  const handleRestaurantSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await profileAPI.createRestaurant(restaurantForm);
      setCreatedProfile({ ...res.data.data, type: 'RESTAURANT' });
      setShowVerification(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create profile');
    }
  };

  const handleShelterSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await profileAPI.createShelter(shelterForm);
      setCreatedProfile({ ...res.data.data, type: 'SHELTER' });
      setShowVerification(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create profile');
    }
  };

  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await profileAPI.createDriver(driverForm);
      setCreatedProfile({ ...res.data.data, type: 'DRIVER' });
      setShowVerification(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create profile');
    }
  };

  const handleVerificationComplete = () => {
    if (createdProfile.type === 'RESTAURANT') navigate('/restaurant');
    if (createdProfile.type === 'SHELTER') navigate('/shelter');
    if (createdProfile.type === 'DRIVER') navigate('/driver');
  };

  if (!user) return <div>Please login first</div>;

  if (showVerification && createdProfile) {
    return (
      <div className="card" style={{ maxWidth: '500px', margin: '40px auto' }}>
        <h2>Profile Created!</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Your profile is pending verification. Submit documents below to get approved.
        </p>
        <VerificationUpload 
          profileType={createdProfile.type}
          profileId={createdProfile.id}
          onSubmitted={handleVerificationComplete}
        />
        <button 
          onClick={handleVerificationComplete}
          style={{ 
            marginTop: '15px', 
            background: 'none', 
            border: 'none', 
            color: '#666',
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          Skip for now →
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '500px', margin: '40px auto' }}>
      <h2>Create {user.role} Profile</h2>
      {error && <div className="error">{error}</div>}

      {user.role === 'RESTAURANT' && (
        <form onSubmit={handleRestaurantSubmit}>
          <div className="form-group">
            <label>Business Name</label>
            <input value={restaurantForm.businessName} onChange={(e) => setRestaurantForm({...restaurantForm, businessName: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input value={restaurantForm.address} onChange={(e) => setRestaurantForm({...restaurantForm, address: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Latitude</label>
            <input type="number" step="any" value={restaurantForm.lat} onChange={(e) => setRestaurantForm({...restaurantForm, lat: parseFloat(e.target.value)})} required />
          </div>
          <div className="form-group">
            <label>Longitude</label>
            <input type="number" step="any" value={restaurantForm.lon} onChange={(e) => setRestaurantForm({...restaurantForm, lon: parseFloat(e.target.value)})} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Profile</button>
        </form>
      )}

      {user.role === 'SHELTER' && (
        <form onSubmit={handleShelterSubmit}>
          <div className="form-group">
            <label>Shelter Name</label>
            <input value={shelterForm.shelterName} onChange={(e) => setShelterForm({...shelterForm, shelterName: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Charity Reg No (optional)</label>
            <input value={shelterForm.charityRegNo} onChange={(e) => setShelterForm({...shelterForm, charityRegNo: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input value={shelterForm.address} onChange={(e) => setShelterForm({...shelterForm, address: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Latitude</label>
            <input type="number" step="any" value={shelterForm.lat} onChange={(e) => setShelterForm({...shelterForm, lat: parseFloat(e.target.value)})} required />
          </div>
          <div className="form-group">
            <label>Longitude</label>
            <input type="number" step="any" value={shelterForm.lon} onChange={(e) => setShelterForm({...shelterForm, lon: parseFloat(e.target.value)})} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Profile</button>
        </form>
      )}

      {user.role === 'DRIVER' && (
        <form onSubmit={handleDriverSubmit}>
          <div className="form-group">
            <label>License Number</label>
            <input value={driverForm.licenseNo} onChange={(e) => setDriverForm({...driverForm, licenseNo: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Vehicle Plate</label>
            <input value={driverForm.vehiclePlate} onChange={(e) => setDriverForm({...driverForm, vehiclePlate: e.target.value})} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Profile</button>
        </form>
      )}
    </div>
  );
}

export default CreateProfile;