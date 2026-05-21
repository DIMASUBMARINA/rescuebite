import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authAPI.login(form);
      const { accessToken, refreshToken, user } = res.data.data;
      login(user, { accessToken, refreshToken });
      
      const paths = {
        CONSUMER: '/consumer',
        RESTAURANT: '/restaurant',
        SHELTER: '/shelter',
        DRIVER: '/driver',
      };
      navigate(paths[user.role] || '/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '40px auto' }}>
      <h2>Login</h2>
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
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;