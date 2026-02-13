import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import './Layout.css';

export function Layout() {
    return (
        <div className="app-layout">
            <div className="app-content">
                <Outlet />
            </div>
            <BottomNav />
        </div>
    );
}
