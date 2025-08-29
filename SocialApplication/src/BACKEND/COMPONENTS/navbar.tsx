import React, { useState, useEffect } from 'react';
import { useUser } from '../../BACKEND/context/UserContext';
import "./navbarStyles.css"
import messageImage from "./CompImages/messenger.png";
import notificationImage from "./CompImages/bell.png";
import profileImage from './CompImages/user.png';
import { useNavigate } from 'react-router-dom';
export default function Navbar() {

    interface UserProfile {
        _id: string;
        username: string;
        role: 'user' | 'admin' | 'moderator';
        firstName?: string;
        lastName?: string;
        profilePhoto?: {
            url?: string;
            publicId?: string;
        };

    }
    const { userId, token, logout } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const navigate = useNavigate();
    // Fetch user profile if logged in
    useEffect(() => {
        if (userId) {
            fetchUserProfile();
        } else {
            setUserProfile(null);
        }
    }, [userId]);

    const fetchUserProfile = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/user/${userId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                console.log("Fetched user profile:", data);
                setUserProfile(data);
            } else {
                console.error("Fetch failed:", data.error);
            }
        } catch (error) {
            console.error('Error fetching user profile', error);
        } finally {
            setIsLoading(false);
        }
    };
    const handleLogout = () => {
        logout();
        navigate('/Login');
    };


    return (
        <nav className="nav">
            <a href="/" className="site-title">Liquid Socialisation</a>
            <ul>
                <li className="active">
                    <a href="/">Pricing</a>
                </li>
                <li>
                    <a href="/messages">
                        <img src={messageImage} alt="Messages" className="icon" />
                    </a>
                </li>
                <li>
                    <a href="/notifications">
                        <img src={notificationImage} alt="Notifications" className="icon" />
                    </a>
                </li>

                <li className="profile-item">
                    {userId ? (
                        // User is logged in - show profile picture with dropdown
                        <div className="profile-dropdown">
                            <img
                                src={userProfile?.profilePhoto?.url || profileImage}
                                alt="Profile"
                                className="profile-picture"
                            />
                            <div className="dropdown-content">
                                <a href="/profile">My Profile</a>
                                <a href="/settings">Settings</a>
                                <button onClick={handleLogout} className="logout-btn">Logout</button>
                            </div>
                        </div>
                    ) : (
                        // User is not logged in - show login button
                        <a href="/Login" className="login-button">
                            Login
                        </a>
                    )}
                </li>
            </ul>
        </nav>
    );
}
