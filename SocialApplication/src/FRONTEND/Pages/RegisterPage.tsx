import React, { useState } from 'react';
import Navbar from '../../BACKEND/COMPONENTS/navbar';
import { Link, useNavigate } from 'react-router-dom';
import './Styles/RegisterPage.css'
const Register: React.FC = () => {
    const [enteredUsername, setEnteredUsername] = useState('');
    const [enteredFirstName, setEnteredFirstName] = useState('');
    const [enteredLastName, setEnteredLastName] = useState('');
    const [enteredEmail, setEnteredEmail] = useState('');
    const [enteredPassword, setEnteredPassword] = useState('');
    const [confirmPassword, setConfirmedPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const nameRegex = /^[A-Za-z]+$/;
    const usernameRegex = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{10,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{10,}$/;
    const navigate = useNavigate();
    const handleRegister = async (e: React.FormEvent) => {
         e.preventDefault();
        //Switch statement to check if the inputs match the regex
        switch (true) {
            case !nameRegex.test(enteredFirstName):
                setError("First name must contain only letters");
                break;
            case !nameRegex.test(enteredLastName):
                setError("Last name must only contain letters");
                break;
            case !usernameRegex.test(enteredUsername):
                setError("Username must be at least 10 characters long and include at least one number and one special character");
                break;
            case !passwordRegex.test(enteredPassword):
                setError("Password must be at least 10 characters long and include at least one number and one special character");
                break;
            case !emailRegex.test(enteredEmail):
                setError("Please enter a valid email address");
                break;
        }
        if (enteredPassword !== confirmPassword) {
            setError("Passwords do not match")
            return;
        }
        //Creation of User Object for Response
        const userData ={
        username: enteredUsername,
        firstName: enteredFirstName,
        lastName: enteredLastName,
        email: enteredEmail,
        password: enteredPassword,
        role:'user'
        }
        const response = await fetch ('http://localhost:5000/user/Register',{
            method:'POST',
            headers: {'Content-Type':'application/json'},
            body:JSON.stringify(userData)
        })
        if(response.ok){
            const result = await response.json();
            setSuccessMessage('User registered successfully');
            console.log('User registered successfully',result);
            navigate("/login")
            setEnteredUsername('');
            setEnteredFirstName('');
            setEnteredLastName('');
            setEnteredEmail('');
            setEnteredPassword('');
            setConfirmedPassword('');
            setError('');
        }else{
        const errorData = await response.json();
        setError(errorData.error || 'Registration failed');
        console.error('Registration failed:', errorData)
        }
    }
    return (
        <>
            <Navbar />
            <div className="register-page-container">
                <div className="create-account-container">
                    <form onSubmit={handleRegister}>
                        <div className="register-input-group">
                            <input
                                type="text"
                                placeholder="First Name"
                                value={enteredFirstName}
                                onChange={(e) => setEnteredFirstName(e.target.value)}
                            />
                        </div>
                        <div className="register-input-group">
                            <input
                                type="text"
                                placeholder="Last Name"
                                value={enteredLastName}
                                onChange={(e) => setEnteredLastName(e.target.value)}
                            />
                        </div>
                        <div className="register-input-group">
                            <input
                                type="text"
                                placeholder="Username"
                                value={enteredUsername}
                                onChange={(e) => setEnteredUsername(e.target.value)}
                            />
                        </div>
                        <div className="register-input-group">
                            <input
                                type="text"
                                placeholder="Email"
                                value={enteredEmail}
                                onChange={(e) => setEnteredEmail(e.target.value)}
                            />
                        </div>
                        <div className="register-input-group">
                            <input
                                type="text"
                                placeholder="Password"
                                value={enteredPassword}
                                onChange={(e) => setEnteredPassword(e.target.value)}
                            />
                        </div>
                        <div className="register-input-group">
                            <input
                                type="text"
                                placeholder=' Confirm Password'
                                value={confirmPassword}
                                onChange={(e) => setConfirmedPassword(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="create-account-button" >Create Account</button>
                        {error && <p className="error-message">{error}</p>}
                        {successMessage && <p className="success-message">{successMessage}</p>}
                    </form>
                    <p className="login-redirect">
                        Already have an account? <Link to="/Login" className="login-link">Login here</Link>
                    </p>
                </div>
            </div>
        </>
    )
}
export default Register;