import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PAGER_CHANNEL_ID } from './pager-types';

/** Foreground + background: sound, banner, badge — pager style. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export async function setupPagerNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(PAGER_CHANNEL_ID, {
      name: 'Lotris Pager Alerts',
      description: 'Urgent ticket assign, escalate, and SLA warnings',
      vibrationPattern: [0, 400, 200, 400, 200, 600],
      lightColor: '#388bfd',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }

  if (!Device.isDevice) {
    return false;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export type PushTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: string };

function resolveProjectId(): string | undefined {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

export async function getExpoPushToken(): Promise<PushTokenResult> {
  if (!Device.isDevice) {
    return { ok: false, reason: 'Push requires a physical phone (not a simulator).' };
  }

  // Expo Go on Android SDK 53+ cannot obtain remote push tokens.
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
    return {
      ok: false,
      reason:
        'Expo Go on Android cannot receive remote push (SDK 53+). Use an iPhone with Expo Go, or install a dev build.',
    };
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    return {
      ok: false,
      reason:
        'Missing EAS project ID. On PC run: cd apps/mobile && npx eas-cli login && npx eas-cli init — then set EXPO_PUBLIC_EAS_PROJECT_ID in apps/mobile/.env and restart Expo.',
    };
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    return {
      ok: false,
      reason:
        'Notification permission not granted. iOS: Settings → Expo Go → Notifications → Allow.',
    };
  }

  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    return { ok: true, token: result.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: message };
  }
}
