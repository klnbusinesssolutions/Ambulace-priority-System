import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from 'antd';
import { FiBell, FiLogOut, FiSearch, FiZap } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import NotificationPanel from './NotificationPanel';
import ProfileMenu from './ProfileMenu';
import { useNotifications } from '../hooks/useNotifications';

function Navbar() {
  const navigate = useNavigate();
  const { logout, user, role } = useContext(AuthContext);
  const { notifications, markRead } = useNotifications({ hospitalId: user?.hospitalId });
  const assignedHospital = user?.hospitalId ? { name: user.hospitalName } : null;
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const notificationWrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationWrapRef.current && !notificationWrapRef.current.contains(event.target)) {
        setOpenNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    try { localStorage.clear(); } catch { }
    logout();
    navigate('/', { replace: true });
  }

  return (
    <header className="navbar">
      <div className="navbar-title">
        <FiZap />
        <div>
          <strong>{user?.hospitalName || 'Emergency Command Center'}</strong>
          <span>{role || 'role'} control surface</span>
        </div>
      </div>

      <div className="navbar-actions">
        <Input
          className="command-search"
          prefix={<FiSearch />}
          placeholder="Search ambulance, driver, or emergency ID"
        />

        <div ref={notificationWrapRef} style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            className="icon-button bell-button"
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => setOpenNotifications((v) => !v)}
          >
            <FiBell />
            {notifications.filter((n) => !n.read).length > 0 && (
              <span style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: '#B91C1C',
                color: 'white',
                borderRadius: '50%',
                width: 18,
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {notifications.filter((n) => !n.read).length}
              </span>
            )}
          </button>

          {openNotifications && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 44,
                zIndex: 9999,
                width: 380,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <NotificationPanel
                notifications={notifications}
                onClose={() => setOpenNotifications(false)}
                onMarkRead={markRead}
              />
            </div>
          )}
        </div>

        <Button
          className="navbar-logout-button"
          icon={<FiLogOut />}
          onClick={handleLogout}
        >
          Logout
        </Button>

        <div style={{ position: 'relative' }}>
          <ProfileMenu
            initials={(user?.email || 'OP').slice(0, 2).toUpperCase()}
            name={user?.email || 'Operator'}
            role={role || 'Operator'}
            hospital={assignedHospital}
            online={true}
            open={openProfile}
            onToggle={() => setOpenProfile((v) => !v)}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </header>
  );
}

export default Navbar;