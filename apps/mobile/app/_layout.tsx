import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LotrisHeader } from '@/components/lotris-header';
import { AuthProvider } from '@/lib/auth-context';
import { BiometricLockProvider } from '@/lib/biometric-lock';
import { PagerAlertsProvider } from '@/lib/pager-alerts-context';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <BiometricLockProvider>
        <PagerAlertsProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="ticket/[id]"
              options={{
                headerTitle: () => <LotrisHeader title="Ticket" subtitle="Detail & actions" />,
                headerStyle: {
                  backgroundColor: colors.bg,
                  borderBottomColor: colors.border,
                  borderBottomWidth: 1,
                },
                headerShadowVisible: false,
              }}
            />
          </Stack>
        </PagerAlertsProvider>
      </BiometricLockProvider>
    </AuthProvider>
  );
}
