
import "./navbarStyles.css"
import messageImage from "./CompImages/messenger.png";
import notificationImage from "./CompImages/bell.png";
import profileImage from './CompImages/user.png';
export default function Navbar() {
    return <nav className="nav">
        <a href="/" className="site-title">Liquid Socialisation</a>
        <ul>
            <li className="active">
                <a href="/">Pricing</a>
            </li>
            <li>
                <a href="/Register">
                    <img src={messageImage}></img>
                </a>
            </li>
            <li>
                <a href="Register">
                    <img src={notificationImage}></img>
                </a>
            </li>
            <li>
                <a href="Register">
                    <img src={profileImage}></img>
                </a>
            </li>
        </ul>
    </nav>
}