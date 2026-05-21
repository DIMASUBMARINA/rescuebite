import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    const paths = {
      CONSUMER: '/consumer',
      RESTAURANT: '/restaurant',
      SHELTER: '/shelter',
      DRIVER: '/driver',
    };
    return paths[user.role] || '/login';
  };

  return (
    <nav className="navbar">
      <div>
        <Link to="/" style={{ fontSize: '20px', fontWeight: 'bold' }}>
          🍽️ RescueBite
        </Link>
      </div>
      <div>
        {user ? (
          <>
            <Link to={getDashboardLink()}>Dashboard</Link>
            <span style={{ marginLeft: '20px' }}>
              {user.email} ({user.role})
            </span>
            <button 
              onClick={handleLogout} 
              className="btn btn-secondary" 
              style={{ marginLeft: '20px' }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;