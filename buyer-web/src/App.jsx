// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import LiveViewer from './pages/LiveViewer';
import CallScreen from './pages/CallScreen';
import ProductPage from './pages/ProductPage';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import OrderHistory from './pages/OrderHistory';
import Wishlist from './pages/Wishlist';

function PrivateRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  return localStorage.getItem('token') ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Protected */}
        <Route path="/"                    element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/live/:sessionId"     element={<PrivateRoute><LiveViewer /></PrivateRoute>} />
        <Route path="/call/:callId"        element={<PrivateRoute><CallScreen /></PrivateRoute>} />
        <Route path="/product/:productId"  element={<PrivateRoute><ProductPage /></PrivateRoute>} />
        <Route path="/shop/:shopId"        element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/cart"                element={<PrivateRoute><Cart /></PrivateRoute>} />
        <Route path="/checkout/:orderId"   element={<PrivateRoute><Checkout /></PrivateRoute>} />
        <Route path="/profile"             element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/orders"              element={<PrivateRoute><OrderHistory /></PrivateRoute>} />
        <Route path="/wishlist"            element={<PrivateRoute><Wishlist /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}