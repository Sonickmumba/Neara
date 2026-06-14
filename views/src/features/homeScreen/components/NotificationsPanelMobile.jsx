import { Bell } from 'lucide-react';

export function NotificationsPanelMobile({ notifications }) {
  return (
    <div className="absolute top-4 right-4 w-64 max-h-[75vh] overflow-y-auto bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Bell className="w-5 h-5" /> Notifications
      </h2>
      <ul className="space-y-2">
        {notifications.map((n) => (
          <li key={n.id} className="text-sm">
            <span className="font-medium">{n.title}</span>
            {n.description ? (
              <span className="block text-gray-500">{n.description}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
