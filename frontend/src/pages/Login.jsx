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
    setError('');
    
    try {
      console.log('Sending login request...', form);
      const res = await authAPI.login(form);
      console.log('Response received:', res.status);
      console.log('res.data:', res.data);
      
      if (!res.data || !res.data.data) {
        console.error('Invalid response structure:', res.data);
        setError('Invalid server response');
        return;
      }
      
      const result = res.data.data;
      console.log('result:', result);
      
      const { accessToken, refreshToken, user } = result;
      
      if (!user || !accessToken) {
        console.error('Missing user or token in response');
        setError('Invalid login response');
        return;
      }
      
      console.log('User:', user);
      console.log('Role:', user.role);
      
      login(user, { accessToken, refreshToken });
      
      const paths = {
        CONSUMER: '/consumer',
        RESTAURANT: '/restaurant',
        SHELTER: '/shelter',
        DRIVER: '/driver',
        ADMIN: '/admin',
      };
      
      const targetPath = paths[user.role];
      console.log('Navigating to:', targetPath);
      navigate(targetPath);
      
    } catch (err) {
      console.error('Login error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || err.message || 'Login failed');
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '40px auto' }}>
      <h2>Login</h2>
      {error && <div className="error" style={{ padding: '10px', background: '#f8d7da', borderRadius: '4px', marginBottom: '15px' }}>{error}</div>}
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