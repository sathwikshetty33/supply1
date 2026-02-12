import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import Auth from './pages/Auth.jsx'
import FarmerLandingPage from './pages/FarmerLandingPage.jsx'
import FarmerDashboard from './pages/FarmerDashboard.jsx'
import MandiLandingPage from './pages/MandiLandingPage.jsx'
import RetailerLandingPage from './pages/RetailerLandingPage.jsx'
import RetailerOrders from './pages/RetailerOrders.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth />} />
      <Route path="/farmer" element={<FarmerLandingPage />} />
      <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
      <Route path="/mandi" element={<MandiLandingPage />} />
      <Route path="/retailer" element={<RetailerLandingPage />} />
      <Route path="/retailer/orders" element={<RetailerOrders />} />
    </Routes>
  )
}

export default App;

