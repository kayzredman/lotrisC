import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { LoadingView } from '@/components/loading-view';
import { LotrisHeader } from '@/components/lotris-header';
import { isLeadRole } from '@/lib/roles';
import { colors } from '@/lib/theme';

function tabOptions(title: string, subtitle?: string) {
  return {
    headerTitle: () => <LotrisHeader title={title} subtitle={subtitle} />,
    headerStyle: {
      backgroundColor: colors.bg,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
    },
    headerShadowVisible: false,
  } as const;
}

export default function TabsLayout() {
  const { accessToken, isLoading, user, session } = useAuth();
  const showLead = isLeadRole(user?.roleName ?? session?.role);

  if (isLoading) return <LoadingView />;
  if (!accessToken) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accentLight,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="alerts"
        options={{
          ...tabOptions('Alerts', 'Pager events'),
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-work"
        options={{
          ...tabOptions('My Work', 'Tickets & today'),
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          ...tabOptions('Queue', 'Claim next'),
          tabBarIcon: ({ color, size }) => <Ionicons name="layers-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="lead"
        options={{
          ...tabOptions('Lead', 'Team assign'),
          href: showLead ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          ...tabOptions('Me', 'Account & push'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
