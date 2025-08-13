import React from 'react';
import Navbar from '../../BACKEND/COMPONENTS/navbar';
import './Styles/HomePage.css'
import feedImage from "../Images/category.png";
import friendsImage from "../Images/friends.png"
import eventImage from "../Images/event.png"
import photosImage from "../Images/gallery.png"
const Home: React.FC = () => {
    return (
        <>
            <Navbar />
            <div className="home-page-container">
                <div className="left-side-wrapper">
                    <div className="social-buttons-container" >
                        <ul>
                            <li>
                                <img src={feedImage}></img>
                                <a>Feed</a>
                            </li>
                            <li>
                                <img src={friendsImage}></img>
                                <a>Friends</a>
                            </li>
                            <li>
                                <img src={eventImage}></img>
                                <a>Event</a>
                            </li>
                            <li>
                                <img src={photosImage}></img>
                                <a>Photos</a>
                            </li>
                        </ul>
                    </div>
                    <div className="pages-you-like-container">
                        <h4>PAGES YOU LIKE</h4>
                        <ul>
                            <li>
                                <a>Fashin Design</a>
                            </li>
                            <li>
                                <a>Graphic Design</a>
                            </li>
                            <li>
                                <a>Web Designer</a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="center-wrapper">
                    <div className="stories-container">
                        <h4>Stories</h4>
                        <ul>
                            <li>
                                <a>Aiden</a>
                            </li>
                            <li>
                                <a>Eric</a>
                            </li>
                            <li>
                                <a>Carli</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="right-wrapper">
                    <div className="friends-container">
                        <h4>Friends</h4>
                        <ul>
                            <li>
                                <p>Alex</p>
                            </li>
                            <li>
                                <p>Gary</p>
                            </li>
                            <li>
                                <p>John</p>
                            </li>
                        </ul>
                    </div>
                    <div className="groups-container">
                        <h4>Groups</h4>
                        <ul>
                            <li>
                                <a>Fishing Group</a>
                            </li>
                            <li>
                                <a>Rowing Group</a>
                            </li>
                            <li>
                                <a>Shooting Group</a>
                            </li>
                        </ul>
                    </div>

                </div>

            </div>
        </>
    )
}

export default Home;