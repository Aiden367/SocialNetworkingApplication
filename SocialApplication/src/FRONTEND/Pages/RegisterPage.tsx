import React, { useState } from 'react';
import Navbar from '../../BACKEND/COMPONENTS/navbar';
const Register: React.FC = () =>{
    const [enteredUsername,setEnteredUsername] = useState('');
    const [enteredFirstName,setEnteredFirstName] = useState('');
    const [enteredLastName,setEnteredLastName] = useState('');
    const [enteredEmail,setEnteredEmail] = useState('');
    const [enteredPassword,setEnteredPassword] = useState('');
    const [confirmPassword,setConfirmedPassword] = useState('');
    const [error,setError] = useState('');
    const[success,setSuccess] = useState('');

    const nameRegex = /^[A-Za-z]+$/;
    const usernameRegex = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{10,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{10,}$/;

    const handleRegister = async(e: React.FormEvent) =>{
        switch(true){
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
        if(enteredPassword !== confirmPassword){
            setError("Passwords do not match")
            return;
        }
    }
    return(
        <>
         <Navbar/>
        <div className="register-page-container">
           <div className="create-account-container">
            

           </div>
        </div>
        </>
    )
}
export default Register;