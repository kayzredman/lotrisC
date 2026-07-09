import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/lib/auth-context';
import { listDevices, registerDevice, revokeDevice } from '@/lib/devices-api';
import { getExpoPushToken, setupPagerNotifications } from '@/lib/notifications-setup';
import { alertFromNotification, type PagerAlert } from '@/lib/pager-types';
import PagerAlertOverlay from '@/components/pager-alert-overlay';

const DEVICE_ID_KEY = 'lotris_device_id';

interface PagerAlertsContextValue {
  alerts: PagerAlert[];
  activeAlert: PagerAlert | null;
  pushEnabled: boolean;
  pushError: string | null;
  retryPushRegistration: () => void;
  dismissActive: () => void;
  markRead: (id: string) => void;
  testPagerAlert: () => void;
}

const PagerAlertsContext = createContext<PagerAlertsContextValue | null>(null);

export function PagerAlertsProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const [alerts, setAlerts] = useState<PagerAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<PagerAlert | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const registerPush = useCallback(async (token: string) => {
    setPushError(null);
    const granted = await setupPagerNotifications();
    if (!granted) {
      setPushEnabled(false);
      setPushError('Notification permission denied');
      return;
    }

    const pushResult = await getExpoPushToken();
    if (!pushResult.ok) {
      setPushEnabled(false);
      setPushError(pushResult.reason);
      return;
    }

    try {
      const device = await registerDevice(pushResult.token, token, 'Lotris Pager');
      await SecureStore.setItemAsync(DEVICE_ID_KEY, device.id);
      setPushEnabled(true);
      setPushError(null);
    } catch (err) {
      setPushEnabled(false);
      setPushError(err instanceof Error ? err.message : 'Device registration failed');
    }
  }, []);

  const handleIncoming = useCallback((title: string, body: string, data: Record<string, unknown>) => {
    const alert = alertFromNotification(data, title, body);
    setAlerts((prev) => [alert, ...prev].slice(0, 50));
    setActiveAlert(alert);
    Vibration.vibrate([0, 400, 200, 400, 200, 600]);
  }, []);

  useEffect(() => {
    void setupPagerNotifications();
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    void registerPush(accessToken);
  }, [accessToken, registerPush]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((n) => {
      const data = (n.request.content.data ?? {}) as Record<string, unknown>;
      handleIncoming(
        n.request.content.title ?? 'Lotris Pager',
        n.request.content.body ?? '',
        data,
      );
    });

    const response = Notifications.addNotificationResponseReceivedListener((r) => {
      const data = (r.notification.request.content.data ?? {}) as Record<string, unknown>;
      const ticketId = data.ticketId ? String(data.ticketId) : undefined;
      if (ticketId) {
        router.push(`/ticket/${ticketId}`);
      }
    });

    return () => {
      received.remove();
      response.remove();
    };
  }, [handleIncoming]);

  const dismissActive = useCallback(() => setActiveAlert(null), []);

  const markRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);

  const testPagerAlert = useCallback(() => {
    handleIncoming('Ticket assigned', 'TEST-0001', {
      eventType: 'TICKET_ASSIGNED',
      ticketRef: 'TEST-0001',
    });
  }, [handleIncoming]);

  const retryPushRegistration = useCallback(() => {
    if (accessToken) void registerPush(accessToken);
  }, [accessToken, registerPush]);

  const value = useMemo(
    () => ({
      alerts,
      activeAlert,
      pushEnabled,
      pushError,
      retryPushRegistration,
      dismissActive,
      markRead,
      testPagerAlert,
    }),
    [alerts, activeAlert, pushEnabled, pushError, retryPushRegistration, dismissActive, markRead, testPagerAlert],
  );

  return (
    <PagerAlertsContext.Provider value={value}>
      {children}
      <PagerAlertOverlay alert={activeAlert} onDismiss={dismissActive} />
    </PagerAlertsContext.Provider>
  );
}

export function usePagerAlerts(): PagerAlertsContextValue {
  const ctx = useContext(PagerAlertsContext);
  if (!ctx) {
    throw new Error('usePagerAlerts must be used within PagerAlertsProvider');
  }
  return ctx;
}

export async function revokeRegisteredDevice(accessToken: string): Promise<void> {
  const deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (deviceId) {
    try {
      await revokeDevice(deviceId, accessToken);
    } catch {
      // best effort
    }
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    return;
  }

  const devices = await listDevices(accessToken);
  await Promise.all(devices.map((d) => revokeDevice(d.id, accessToken).catch(() => undefined)));
}
