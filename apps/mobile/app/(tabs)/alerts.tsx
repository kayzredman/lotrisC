import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

const PLACEHOLDER_ALERTS = [
  { title: 'Push alerts arrive in Phase 3', sub: 'Assign · Escalate · SLA warning' },
  { title: 'In-app history', sub: 'Recent notifications will list here' },
];

export default function AlertsScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>Alerts feed — push notifications in Phase 3</Text>
      {PLACEHOLDER_ALERTS.map((item) => (
        <View key={item.title} style={styles.card}>
          <Ionicons name="notifications-off-outline" size={22} color={colors.muted} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSub}>{item.sub}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 10 },
  hint: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardText: { flex: 1, gap: 4 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  cardSub: { color: colors.muted, fontSize: 13 },
});
