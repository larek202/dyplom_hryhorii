import { Outlet } from 'react-router-dom';
import './layout.css';

export default function AuthLayout() {
  return (
    <div className="mm-auth-root">
      <div className="mm-auth-card">
        <Outlet />
      </div>
    </div>
  );
}
