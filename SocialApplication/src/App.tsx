import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './FRONTEND/Pages/HomePage'
import RegisterPage from './FRONTEND/Pages/RegisterPage'
import ProfilePage from './FRONTEND/Pages/ProfilePage'
import LoginPage from './FRONTEND/Pages/LoginPage'
import { UserProvider } from './BACKEND/context/UserContext'; 
const App: React.FC = () =>{
  return(
     <UserProvider>
    <Router>
      <Routes>
      <Route path="/" element= {<HomePage/>} />
      <Route path="/Home" element= {<HomePage/>} />
      <Route path="/Register" element= {<RegisterPage/>} />
      <Route path="/Profile" element= {<ProfilePage/>}/>
      <Route path="/Login" element= {<LoginPage/>}/>
      </Routes>
    </Router>
    </UserProvider>
  )
}

export default App
