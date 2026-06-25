"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import type { NotificationItem } from "@/app/api/notifications/route";
import { apiFetch } from "@/lib/apiFetch";

type NotificationsContextType = {
  notifications: NotificationItem[];
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  markAllRead: async () => {},
  clearAll: async () => {},
  removeNotification: async () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!profile) return;
    apiFetch(`/api/notifications?userId=${profile.id}`)
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const markAllRead = useCallback(async () => {
    await apiFetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(async () => {
    await apiFetch("/api/notifications", { method: "DELETE" });
    setNotifications([]);
  }, []);

  const removeNotification = useCallback(async (id: string) => {
    await apiFetch(`/api/notifications?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const contextValue = useMemo(() => ({ notifications, markAllRead, clearAll, removeNotification }), [notifications, markAllRead, clearAll, removeNotification]);
  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
