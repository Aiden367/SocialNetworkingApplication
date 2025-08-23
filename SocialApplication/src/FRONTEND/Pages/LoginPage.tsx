import React, { useState } from 'react';
import Navbar from '../../BACKEND/COMPONENTS/navbar';
import { Link, useNavigate } from 'react-router-dom';
import './Styles/LoginPage.css';
import { useUser } from '../../BACKEND/context/UserContext';

const Login: React.FC = () => {

    const [enteredEmail, setEnteredEmail] = useState('');
    const [enteredPassword, setEnteredPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();
    const { login } = useUser()

    //Method to handle login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const loginData = {
            email: enteredEmail,
            password: enteredPassword
        }
        try {
            //API ping to backend 
            const response = await fetch('http://localhost:5000/user/Login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData),
            });
            if (response.ok) {
                const result = await response.json();
                setSuccessMessage('Login Sucessfull');
                login(result.user.id, result.token);
                navigate('/Home');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Login Failed')
            }
        } catch (error) {
            console.error('Cannot login', error);
        }
    }
    return (
        <>
        <Navbar />
        <div className="Login-Page-Container">
            <div className="Login-Container">
                <form onSubmit={handleLogin}>
                    <div className="Login-Input-Container">
                        <input
                            type="text"
                            placeholder="Email"
                            value={enteredEmail}
                            onChange={(e) => setEnteredEmail(e.target.value)}
                        />
                    </div>
                    <div className="Login-Input-Container">
                        <input
                            type="text"
                            placeholder="Password"
                            value={enteredPassword}
                            onChange={(e) => setEnteredPassword(e.target.value)}
                        />
                    </div>
                    <button className="login-button">Login</button>
                </form>
                {error && <p className="error-message">{error}</p>}
                {successMessage && <p className="success-message">{successMessage}</p>}
                <p className="register-message">
                    Don't have an account? <Link to="/Register" className="register-link">Register here</Link>
                </p>
            </div>
        </div>
        </>

    )
}

export default Login;