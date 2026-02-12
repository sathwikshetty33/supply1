import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import FarmerLandingPage from './pages/FarmerLandingPage.jsx'
import MandiLandingPage from './pages/MandiLandingPage.jsx'
import RetailerLandingPage from './pages/RetailerLandingPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/farmer" element={<FarmerLandingPage />} />
      <Route path="/mandi" element={<MandiLandingPage />} />
      <Route path="/retailer" element={<RetailerLandingPage />} />
    </Routes>
  )
}

export default App
