import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './FRONTEND/Pages/HomePage'
import RegisterPage from './FRONTEND/Pages/RegisterPage'
import ProfilePage from './FRONTEND/Pages/ProfilePage'
import LoginPage from './FRONTEND/Pages/LoginPage'
import CreateGroupPage from './FRONTEND/Pages/CreateGroupPage'
import GroupPage from './FRONTEND/Pages/GroupPage'
import AdvicePage from './FRONTEND/Pages/AdvicePage'
import AdminDashboard from './FRONTEND/Pages/AdminDashboard' // Add this import
import ProtectedAdminRoute from './BACKEND/COMPONENTS/ProtectedRoute' // Add this import
import { UserProvider } from './BACKEND/context/UserContext';
import FriendProfile from './FRONTEND/Pages/FriendProfilePage';

const App: React.FC = () => {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/Home" element={<HomePage />} />
          <Route path="/Register" element={<RegisterPage />} />
          <Route path="/Profile" element={<ProfilePage />} />
          <Route path="/Login" element={<LoginPage />} />
          <Route path="/CreateGroup" element={<CreateGroupPage />} />
          <Route path="/group/:groupId" element={<GroupPage />} />
          <Route path="/Advice" element={<AdvicePage/>} />
          <Route path="/friend/:friendId" element={<FriendProfile />} />
          {/* Protected Admin Route */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            } 
          />
        </Routes>
      </Router>
    </UserProvider>
  )
}

export default App