import { useState, useEffect } from 'react';
import api from '../services/api';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.data);
    } catch (err) {
      alert('Failed to load users');
    }
  };

  const handleSuspend = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/suspend`);
      alert('User suspended!');
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to suspend');
    }
  };

  const handleUnsuspend = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/unsuspend`);
      alert('User unsuspended!');
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unsuspend');
    }
  };

  return (
    <div>
      <h2>Admin Dashboard</h2>
      
      <h3>All Users</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
        <thead>
          <tr style={{ background: '#2c3e50', color: 'white' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Role</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Profile</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px' }}>{user.email}</td>
              <td style={{ padding: '10px' }}>
                <span className={`badge badge-${user.role.toLowerCase()}`}>
                  {user.role}
                </span>
              </td>
              <td style={{ padding: '10px' }}>
                {user.restaurant?.businessName || user.shelter?.shelterName || user.driver?.licenseNo || '—'}
              </td>
              <td style={{ padding: '10px' }}>
                {user.isSuspended ? (
                  <span style={{ color: '#dc3545', fontWeight: 'bold' }}>🚫 SUSPENDED</span>
                ) : (
                  <span style={{ color: '#28a745' }}>✅ Active</span>
                )}
              </td>
              <td style={{ padding: '10px' }}>
                {user.role !== 'ADMIN' && (
                  user.isSuspended ? (
                    <button 
                      className="btn btn-primary" 
                      onClick={() => handleUnsuspend(user.id)}
                    >
                      Unsuspend
                    </button>
                  ) : (
                    <button 
                      className="btn btn-danger" 
                      onClick={() => handleSuspend(user.id)}
                    >
                      Suspend
                    </button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboard;