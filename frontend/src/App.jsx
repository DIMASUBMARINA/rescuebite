import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Layout/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import ConsumerDashboard from './pages/ConsumerDashboard';
import RestaurantDashboard from './pages/RestaurantDashboard';
import ShelterDashboard from './pages/ShelterDashboard';
import DriverDashboard from './pages/DriverDashboard';
import CreateProfile from './pages/CreateProfile';

function App() {
  const { user } = useAuth();

  return (
    <div>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/create-profile" element={<CreateProfile />} />
          <Route 
            path="/consumer" 
            element={user?.role === 'CONSUMER' ? <ConsumerDashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/restaurant" 
            element={user?.role === 'RESTAURANT' ? <RestaurantDashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/shelter" 
            element={user?.role === 'SHELTER' ? <ShelterDashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/driver" 
            element={user?.role === 'DRIVER' ? <DriverDashboard /> : <Navigate to="/login" />} 
          />
          <Route path="/" element={<Navigate to={user ? `/${user.role.toLowerCase()}` : '/login'} />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;