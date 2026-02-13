import { NavLink } from 'react-router-dom';
import { haptic } from '../lib/telegram';
import { IconHome, IconMarket, IconPlus, IconWallet, IconUser } from './Icons';
import './BottomNav.css';

const tabs = [
    { path: '/', Icon: IconHome, label: 'Home' },
    { path: '/market', Icon: IconMarket, label: 'Market' },
    { path: '/create', Icon: IconPlus, label: 'New Ad' },
    { path: '/wallet', Icon: IconWallet, label: 'Wallet' },
    { path: '/profile', Icon: IconUser, label: 'Profile' },
];

export function BottomNav() {
    return (
        <nav className="bottom-nav">
            {tabs.map((tab) => (
                <NavLink
                    key={tab.path}
                    to={tab.path}
                    className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
                    onClick={() => haptic('selection')}
                    end={tab.path === '/'}
                >
                    <span className="nav-icon"><tab.Icon size={22} /></span>
                    <span className="nav-label">{tab.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
