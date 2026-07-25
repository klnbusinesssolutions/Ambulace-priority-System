import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from 'antd';
import { FiBell, FiLogOut, FiSearch, FiZap, FiTruck, FiUser, FiAlertTriangle } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import NotificationPanel from './NotificationPanel';
import ProfileMenu from './ProfileMenu';
import { useNotifications } from '../hooks/useNotifications';
import { useGlobalSearch } from '../hooks/useGlobalSearch';

function Navbar() {
  const navigate = useNavigate();
  const { logout, user, role } = useContext(AuthContext);
  const { notifications, markRead } = useNotifications({ hospitalId: user?.hospitalId });
  const assignedHospital = user?.hospitalId ? { name: user.hospitalName } : null;
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const notificationWrapRef = useRef(null);
  const searchWrapRef = useRef(null);

  const { term, setTerm, results, hasResults } = useGlobalSearch();

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationWrapRef.current && !notificationWrapRef.current.contains(event.target)) {
        setOpenNotifications(false);
      }
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) {
        setOpenSearch(false);
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

  function goToDriver() {
    setOpenSearch(false);
    setTerm('');
    navigate('/my-drivers');
  }

  function goToAmbulance() {
    setOpenSearch(false);
    setTerm('');
    navigate('/my-ambulances');
  }

  function goToEmergency(id) {
    setOpenSearch(false);
    setTerm('');
    navigate(`/emergency/${id}`);
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
        <div ref={searchWrapRef} className="command-search-wrap">
          <Input
            className="command-search"
            prefix={<FiSearch />}
            placeholder="Search ambulance, driver, or emergency ID"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setOpenSearch(true);
            }}
            onFocus={() => setOpenSearch(true)}
            allowClear
          />

          {openSearch && term.trim() && (
            <div className="command-search-results">
              {!hasResults && <div className="command-search-empty">No matches found.</div>}

              {results.emergencies.length > 0 && (
                <div className="command-search-group">
                  <span className="command-search-group-title">Emergencies</span>
                  {results.emergencies.map((e) => (
                    <button key={e.id} className="command-search-item" onClick={() => goToEmergency(e.id)}>
                      <FiAlertTriangle />
                      <span>
                        <strong>{e.displayId}</strong> — {e.incidentType || 'Incident'} · {e.patientName || 'Unnamed patient'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {results.ambulances.length > 0 && (
                <div className="command-search-group">
                  <span className="command-search-group-title">Ambulances</span>
                  {results.ambulances.map((a) => (
                    <button key={a.id} className="command-search-item" onClick={goToAmbulance}>
                      <FiTruck />
                      <span>
                        <strong>{a.numberPlate || a.registrationNumber}</strong> · {a.vehicleType || 'Ambulance'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {results.drivers.length > 0 && (
                <div className="command-search-group">
                  <span className="command-search-group-title">Drivers</span>
                  {results.drivers.map((d) => (
                    <button key={d.id} className="command-search-item" onClick={goToDriver}>
                      <FiUser />
                      <span>{d.Name || d.fullName || 'Unnamed driver'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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