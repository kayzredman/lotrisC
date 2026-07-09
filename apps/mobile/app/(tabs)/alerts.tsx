import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { usePagerAlerts } from '@/lib/pager-alerts-context';
import { formatWhen } from '@/lib/format';
import { colors } from '@/lib/theme';
import { EmptyState } from '@/components/status-chip';

export default function AlertsScreen() {
  const { alerts, pushEnabled, markRead } = usePagerAlerts();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Pager alerts: sound + vibration + full-screen when the app is open. Push registration{' '}
        {pushEnabled ? 'active' : 'pending permission'}.
      </Text>

      {alerts.length === 0 ? (
        <EmptyState message="No alerts yet. Assignments, escalations, and SLA warnings will appear here." />
      ) : (
        alerts.map((alert) => (
          <Pressable
            key={alert.id}
            style={[styles.card, !alert.read && styles.unread]}
            onPress={() => {
              markRead(alert.id);
              if (alert.ticketId) router.push(`/ticket/${alert.ticketId}`);
            }}
          >
            <View style={styles.row}>
              <Text style={styles.event}>{alert.eventType.replace(/_/g, ' ')}</Text>
              {!alert.read ? <View style={styles.dot} /> : null}
            </View>
            <Text style={styles.title}>{alert.title}</Text>
            <Text style={styles.body}>{alert.body}</Text>
            <Text style={styles.time}>{formatWhen(alert.receivedAt)}</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  hint: {
    color: colors.mutedLight,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  unread: {
    borderColor: colors.accent,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  event: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '600' },
  body: { color: colors.text, fontSize: 15 },
  time: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
