import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './FRONTEND/Pages/HomePage'
import RegisterPage from './FRONTEND/Pages/RegisterPage'
import ProfilePage from './FRONTEND/Pages/ProfilePage'
const App: React.FC = () =>{
  return(
    <Router>
      <Routes>
      <Route path="/" element= {<HomePage/>} />
      <Route path="/Home" element= {<HomePage/>} />
      <Route path="/Register" element= {<RegisterPage/>} />
      <Route path="/Profile" element= {<ProfilePage/>}/>
      </Routes>
    </Router>
  )
}

export default App
