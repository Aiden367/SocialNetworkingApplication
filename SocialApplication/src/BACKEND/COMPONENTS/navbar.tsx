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
    const [messageCount] = useState(3); // Mock notification count
    const [notificationCount] = useState(7); // Mock notification count
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
        <nav className={`nav ${isLoading ? 'nav-loading' : ''}`}>
            <a href="/" className="site-title">
                DevSocial
            </a>
            <ul>
                <li className="active">
                    <a href="/">
                        <span>dashboard</span>
                        <div className="nav-tooltip">main interface</div>
                    </a>
                </li>
                <li style={{ position: 'relative' }}>
                    <a href="/messages">
                        <img src={messageImage} alt="Messages" className="icon" />
                        {messageCount > 0 && (
                            <span className="notification-badge">{messageCount}</span>
                        )}
                        <div className="nav-tooltip">messages.exe</div>
                    </a>
                </li>
                <li style={{ position: 'relative' }}>
                    <a href="/notifications">
                        <img src={notificationImage} alt="Notifications" className="icon" />
                        {notificationCount > 0 && (
                            <span className="notification-badge">{notificationCount}</span>
                        )}
                        <div className="nav-tooltip">alerts.log</div>
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
                                <a href="/profile">profile.config</a>
                                <a href="/settings">settings.json</a>
                                <a href="/projects">projects/</a>
                                <a href="/repositories">repositories/</a>
                                <div style={{ 
                                    borderTop: '1px solid #30363d', 
                                    margin: '8px 0',
                                    opacity: 0.3
                                }}></div>
                                <button onClick={handleLogout} className="logout-btn">
                                    logout
                                </button>
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