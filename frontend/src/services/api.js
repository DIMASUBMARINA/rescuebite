import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (data) => api.post('/auth/logout', data),
};

export const profileAPI = {
  createRestaurant: (data) => api.post('/profile/restaurant', data),
  createShelter: (data) => api.post('/profile/shelter', data),
  createDriver: (data) => api.post('/profile/driver', data),
};

export const inventoryAPI = {
  list: (params) => api.get('/inventory', { params }),
  myDishes: (params) => api.get('/inventory/my-dishes', { params }),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.patch(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
};

export const orderAPI = {
  create: (data) => api.post('/orders', data),
  confirm: (id) => api.post(`/orders/${id}/confirm`),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
  pay: (id) => api.post(`/orders/${id}/pay`),
  confirmByRestaurant: (id) => api.post(`/orders/${id}/confirm`),
  markReady: (id) => api.post(`/orders/${id}/ready`),
  markPickedUpByConsumer: (id) => api.post(`/orders/${id}/picked-up`),
  listByRestaurant: () => api.get('/orders/my-restaurant-orders'),
  listByConsumer: () => api.get('/orders/my-orders'),
};

export const shelterAPI = {
  availableDonations: () => api.get('/shelters/available-donations'),
  claim: (data) => api.post('/shelters/claims', data),
  myClaims: () => api.get('/shelters/my-claims'), 
  confirmReceipt: (claimId) => api.post(`/shelters/claims/${claimId}/confirm-receipt`),
};

export const verificationAPI = {
  submit: (data) => api.post('/verification/submit', data),
};

export const driverAPI = {
  availablePickups: () => api.get('/drivers/available-pickups'),
  claimPickup: (id) => api.post(`/drivers/pickups/${id}/claim`),
  markPickedUp: (id) => api.post(`/drivers/pickups/${id}/mark-picked-up`),
  markDelivered: (id) => api.post(`/drivers/pickups/${id}/mark-delivered`),
};


