import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './FRONTEND/Pages/HomePage'
const App: React.FC = () =>{
  return(
    <Router>
      <Routes>
      <Route path="/" element= {<HomePage/>} />
      <Route path="/Home" element= {<HomePage/>} />
      </Routes>
    </Router>
  )
}

export default App
