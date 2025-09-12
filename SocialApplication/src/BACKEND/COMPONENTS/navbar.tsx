import React, { useState, useEffect, useRef } from 'react';
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
    const [messageCount] = useState(3);
    const [notificationCount] = useState(7);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Fetch user profile if logged in
    useEffect(() => {
        if (userId) {
            fetchUserProfile();
        } else {
            setUserProfile(null);
        }
    }, [userId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
        setDropdownOpen(false);
        navigate('/Login');
    };

    const toggleDropdown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Toggle dropdown clicked, current state:', dropdownOpen); // Debug log
        setDropdownOpen(prev => !prev);
    };

    // Check if user is admin
    const isAdmin = userProfile?.role === 'admin';

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
                
                {/* Admin Dashboard - Only show for admin users */}
                {isAdmin && (
                    <li className="admin-nav">
                        <a href="/admin/dashboard">
                            <span>admin</span>
                            <div className="nav-tooltip">admin.panel</div>
                        </a>
                    </li>
                )}

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
                        <div 
                            className={`profile-dropdown ${dropdownOpen ? 'dropdown-open' : ''}`}
                            ref={dropdownRef}
                        >
                            <img
                                src={userProfile?.profilePhoto?.url || profileImage}
                                alt="Profile"
                                className="profile-picture"
                                onClick={toggleDropdown}
                                style={{ cursor: 'pointer' }} // Ensure cursor shows it's clickable
                            />
                            
                            {/* Dropdown Menu */}
                            <div className={`dropdown-content ${dropdownOpen ? 'show' : ''}`}>
                                <a href="/profile" onClick={() => setDropdownOpen(false)}>
                                    profile.config
                                </a>
                                <a href="/settings" onClick={() => setDropdownOpen(false)}>
                                    settings.json
                                </a>
                                <a href="/projects" onClick={() => setDropdownOpen(false)}>
                                    projects/
                                </a>
                                <a href="/repositories" onClick={() => setDropdownOpen(false)}>
                                    repositories/
                                </a>

                                {/* Admin Dashboard link */}
                                {isAdmin && (
                                    <>
                                        <div className="dropdown-divider"></div>
                                        <a 
                                            href="/admin/dashboard" 
                                            className="admin-link"
                                            onClick={() => setDropdownOpen(false)}
                                        >
                                            admin.panel
                                        </a>
                                    </>
                                )}

                                <div className="dropdown-divider"></div>
                                <button 
                                    onClick={handleLogout} 
                                    className="logout-btn"
                                    type="button"
                                >
                                    logout
                                </button>
                            </div>
                        </div>
                    ) : (
                        <a href="/Login" className="login-button">
                            Login
                        </a>
                    )}
                </li>
            </ul>
        </nav>
    );
}