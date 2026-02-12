import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import FarmerLandingPage from './pages/FarmerLandingPage.jsx'
import FarmerDashboard from './pages/FarmerDashboard.jsx'
import MandiLandingPage from './pages/MandiLandingPage.jsx'
import RetailerLandingPage from './pages/RetailerLandingPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/farmer" element={<FarmerLandingPage />} />
      <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
      <Route path="/mandi" element={<MandiLandingPage />} />
      <Route path="/retailer" element={<RetailerLandingPage />} />
    </Routes>
  )
}

export default App;
