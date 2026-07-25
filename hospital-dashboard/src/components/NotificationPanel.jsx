import { motion } from 'framer-motion';
import { FiX, FiAlertTriangle, FiUserCheck, FiTruck, FiBell } from 'react-icons/fi';

function getCategory(type = '') {
  const t = type.toLowerCase();
  if (t.includes('emergency') || t.includes('sos')) {
    return { key: 'emergency', label: 'Emergency', color: '#B91C1C', bg: '#FEE2E2', icon: FiAlertTriangle, priority: 0 };
  }
  if (t.includes('driver')) {
    return { key: 'driver', label: 'Driver', color: '#1D4ED8', bg: '#DBEAFE', icon: FiUserCheck, priority: 1 };
  }
  if (t.includes('ambulance')) {
    return { key: 'ambulance', label: 'Ambulance', color: '#0F766E', bg: '#CCFBF1', icon: FiTruck, priority: 1 };
  }
  return { key: 'general', label: 'System', color: '#6B7280', bg: '#F3F4F6', icon: FiBell, priority: 2 };
}

function toDate(value) {
  if (!value) return null;
  return value?.toDate ? value.toDate() : new Date(value);
}

function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return '';
  const datePart = d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}

export default function NotificationPanel({ notifications = [], onClose, onMarkRead }) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const sorted = [...notifications].sort((a, b) => {
    const catA = getCategory(a.type);
    const catB = getCategory(b.type);
    if (catA.priority !== catB.priority) return catA.priority - catB.priority;
    if (a.read !== b.read) return a.read ? 1 : -1;
    const dateA = toDate(a.timestamp)?.getTime() || 0;
    const dateB = toDate(b.timestamp)?.getTime() || 0;
    return dateB - dateA;
  });

  return (
    <motion.div
      className="notification-panel glass-card"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      style={{ width: 380, position: 'absolute', right: 0, top: 44, zIndex: 50, maxHeight: 480, overflowY: 'auto' }}
      role="region"
      aria-label="Emergency notifications"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="notification-panel-header">
        <div>
          <p className="panel-overline">Dispatch Alerts</p>
          <strong>Notifications ({unreadCount} unread)</strong>
        </div>
        <button className="icon-button small" onClick={onClose} aria-label="Close notifications">
          <FiX />
        </button>
      </div>

      <div className="notification-list">
        {sorted.length === 0 && (
          <div className="notification-empty">No notifications yet</div>
        )}

        {sorted.map((note) => {
          const category = getCategory(note.type);
          const Icon = category.icon;
          const title = note.title || note.type?.replaceAll('_', ' ') || 'System update';
          const message = note.message || '';
          const receivedLabel = formatDateTime(note.timestamp);
          const resolvedLabel = note.resolvedAt ? formatDateTime(note.resolvedAt) : '';

          return (
            <motion.article
              className={`notification-item ${note.read ? '' : 'unread'}`}
              key={note.id}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.18 }}
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead?.(note.id);
              }}
              style={{
                opacity: note.read ? 0.75 : 1,
                cursor: 'pointer',
                borderLeft: `3px solid ${category.color}`,
              }}
            >
              <div className="notification-item-top">
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: category.bg,
                    color: category.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  <Icon size={14} />
                </span>
                <div className="notification-details">
                  <div className="notification-title-row">
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: category.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}>
                      {category.label}
                    </span>
                    {!note.read && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        color: '#B91C1C',
                        background: '#FEE2E2',
                        padding: '2px 8px',
                        borderRadius: 999,
                        whiteSpace: 'nowrap',
                        marginLeft: 'auto',
                      }}>
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="notification-title">{title}</p>
                  {message && <p className="notification-message">{message}</p>}
                  {receivedLabel && (
                    <p className="notification-meta">Received: {receivedLabel}</p>
                  )}
                  {resolvedLabel && (
                    <p className="notification-meta" style={{ color: '#15803D' }}>
                      Resolved: {resolvedLabel}
                    </p>
                  )}
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </motion.div>
  );
}