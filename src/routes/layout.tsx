import { Outlet } from '@modern-js/runtime/router';
import '../bff-client';
import './index.css';

export default function Layout() {
  return (
    <div>
      <Outlet />
    </div>
  );
}
