import { motion } from 'framer-motion';

function toDate(value) {
  if (!value) return null;
  return value?.toDate ? value.toDate() : new Date(value);
}

function getTimeAgo(timestamp) {
  const past = toDate(timestamp);
  if (!past) return 'now';
  const now = new Date();
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} mins ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  return past.toLocaleDateString([], { day: '2-digit', month: 'short' }) +
    ', ' + past.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getExactTime(timestamp) {
  const d = toDate(timestamp);
  if (!d) return '';
  return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ActivityTimeline({ items = [], onItemClick }) {
  return (
    <div className="timeline timeline-scroll">
      {items.map((item, index) => {
        const message = typeof item === 'string' ? item : item.message;
        const priority = typeof item === 'string' ? 'info' : item.priority || 'info';
        const timestamp = typeof item === 'string' ? null : item.timestamp;
        const clickable = typeof item !== 'string' && !!onItemClick && item.id !== 'empty';

        return (
          <motion.div
            className={`timeline-item timeline-${priority}${clickable ? ' timeline-clickable' : ''}`}
            key={`${message}-${index}`}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            onClick={clickable ? () => onItemClick(item) : undefined}
            title={timestamp ? getExactTime(timestamp) : undefined}
          >
            <span />
            <p>{message}</p>
            <small>{getTimeAgo(timestamp)}</small>
          </motion.div>
        );
      })}
    </div>
  );
}

export default ActivityTimeline;