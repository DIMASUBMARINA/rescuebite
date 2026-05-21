import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

function Register() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'CONSUMER',
    phone: '',
  });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authAPI.register(form);
      const { accessToken, refreshToken, user } = res.data.data;
      login(user, { accessToken, refreshToken });
      
      const needsProfile = ['RESTAURANT', 'SHELTER', 'DRIVER'];
      if (needsProfile.includes(user.role)) {
        navigate('/create-profile');
      } else {
        navigate('/consumer');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '40px auto' }}>
      <h2>Register</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input 
            type="email" 
            value={form.email} 
            onChange={(e) => setForm({...form, email: e.target.value})}
            required 
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            value={form.password} 
            onChange={(e) => setForm({...form, password: e.target.value})}
            required 
            minLength={8}
          />
        </div>
        <div className="form-group">
          <label>Role</label>
          <select 
            value={form.role} 
            onChange={(e) => setForm({...form, role: e.target.value})}
          >
            <option value="CONSUMER">Consumer</option>
            <option value="RESTAURANT">Restaurant</option>
            <option value="SHELTER">Shelter</option>
            <option value="DRIVER">Driver</option>
          </select>
        </div>
        <div className="form-group">
          <label>Phone (optional)</label>
          <input 
            type="tel" 
            value={form.phone} 
            onChange={(e) => setForm({...form, phone: e.target.value})}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          Register
        </button>
      </form>
    </div>
  );
}

export default Register;