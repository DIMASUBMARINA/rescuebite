import { useState, useEffect } from 'react';
import api from '../services/api';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
    loadDocuments();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.data);
    } catch (err) {
      alert('Failed to load users');
    }
  };


  const getProfileName = (doc) => {
    if (doc.restaurant) return `Restaurant: ${doc.restaurant.businessName}`;
    if (doc.shelter) return `Shelter: ${doc.shelter.shelterName}`;
    if (doc.driver) return `Driver: ${doc.driver.licenseNo}`;
    return `${doc.profileType} (${doc.profileId.slice(-8)})`;
};

  const loadDocuments = async () => {
    try {
      const res = await api.get('/admin/verification/pending');
      setDocuments(res.data.data);
    } catch (err) {
      console.error('Failed to load documents');
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

  const handleReview = async (docId, status) => {
    try {
      await api.post(`/admin/verification/${docId}/review`, {
        status,
        note: status === 'APPROVED' ? 'Verified by admin' : 'Rejected: insufficient proof',
      });
      alert(`Document ${status.toLowerCase()}!`);
      loadDocuments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to review');
    }
  };


  const getStatusBadge = (status) => {
    const colors = {
      PENDING: '#ffc107',
      APPROVED: '#28a745',
      REJECTED: '#dc3545',
    };
    return (
      <span style={{ 
        color: colors[status] || '#666', 
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: '12px'
      }}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <h2>Admin Dashboard</h2>
      
      <h3>Pending Verifications</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', marginBottom: '40px' }}>
        <thead>
          <tr style={{ background: '#2c3e50', color: 'white' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Profile</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Document Type</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Document</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Submitted</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                No pending verifications
              </td>
            </tr>
          ) : (
            documents.map(doc => (
              <tr key={doc.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{getProfileName(doc)}</td>
                <td style={{ padding: '10px' }}>{doc.documentType}</td>
                <td style={{ padding: '10px' }}>
                  <a 
                    href={doc.documentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#007bff' }}
                  >
                    View Document
                  </a>
                </td>
                <td style={{ padding: '10px' }}>{getStatusBadge(doc.status)}</td>
                <td style={{ padding: '10px' }}>
                  {new Date(doc.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleReview(doc.id, 'APPROVED')}
                    style={{ marginRight: '8px' }}
                  >
                    ✅ Approve
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleReview(doc.id, 'REJECTED')}
                  >
                    ❌ Reject
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

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