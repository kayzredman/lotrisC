import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { EmptyState } from '@/components/status-chip';
import { LoadingView } from '@/components/loading-view';
import { fetchTeamWorkload } from '@/lib/analytics-api';
import { useAuth } from '@/lib/auth-context';
import { batchReassignTickets, fetchQueue } from '@/lib/tickets-api';
import { colors } from '@/lib/theme';

export default function LeadScreen() {
  const { accessToken, user } = useAuth();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [engineers, setEngineers] = useState<
    { engineerId: string; fullName: string; openTickets: number; maxCapacity: number; loadPct: number }[]
  >([]);
  const [suggestions, setSuggestions] = useState<
    {
      ticketId: string;
      ticketTitle: string;
      fromEngineerName: string;
      toEngineerId: string;
      toEngineerName: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    try {
      let tid = user?.teamId ?? null;
      if (!tid) {
        const queue = await fetchQueue(accessToken);
        tid = queue[0]?.teamId ?? null;
      }
      setTeamId(tid);
      if (!tid) {
        setEngineers([]);
        setSuggestions([]);
        return;
      }
      const data = await fetchTeamWorkload(accessToken, tid);
      setEngineers(data.engineers);
      setSuggestions(data.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workload');
    } finally {
      setLoading(false);
    }
  }, [accessToken, user?.teamId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function applyAll() {
    if (!accessToken || suggestions.length === 0) return;
    setApplying(true);
    setStatus(null);
    setError(null);
    try {
      const result = await batchReassignTickets(
        accessToken,
        suggestions.map((s) => ({ ticketId: s.ticketId, toEngineerId: s.toEngineerId })),
      );
      setStatus(`Reassigned ${result.reassigned} of ${suggestions.length} ticket(s).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch assign failed');
    } finally {
      setApplying(false);
    }
  }

  function confirmApplyAll() {
    if (suggestions.length === 0) return;
    Alert.alert(
      'Apply workload suggestions',
      `Assign ${suggestions.length} ticket(s) to balance team load?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Apply', onPress: () => void applyAll() },
      ],
    );
  }

  if (loading && !refreshing) return <LoadingView />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      <Text style={styles.hint}>
        Team Lead quick assign — uses workload suggestions and batch-reassign API.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {status ? <Text style={styles.ok}>{status}</Text> : null}

      {!teamId ? (
        <EmptyState message="No team context — open Queue first or set your team on the account." />
      ) : null}

      {engineers.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team load</Text>
          {engineers.map((e) => (
            <View key={e.engineerId} style={styles.loadRow}>
              <Text style={styles.loadName}>{e.fullName}</Text>
              <Text style={[styles.loadPct, loadColor(e.loadPct)]}>
                {e.openTickets}/{e.maxCapacity} ({e.loadPct}%)
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suggestions ({suggestions.length})</Text>
        {suggestions.length === 0 ? (
          <EmptyState message="No rebalance suggestions — team load looks balanced." />
        ) : (
          suggestions.map((s) => (
            <View key={s.ticketId} style={styles.suggestion}>
              <Text style={styles.sugTitle} numberOfLines={2}>
                {s.ticketTitle}
              </Text>
              <Text style={styles.sugMeta}>
                {s.fromEngineerName} → {s.toEngineerName}
              </Text>
            </View>
          ))
        )}
      </View>

      {suggestions.length > 0 ? (
        <Pressable
          style={[styles.applyBtn, applying && styles.applyBusy]}
          onPress={confirmApplyAll}
          disabled={applying}
        >
          <Text style={styles.applyText}>
            {applying ? 'Applying…' : `Apply all (${suggestions.length})`}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function loadColor(pct: number) {
  if (pct >= 100) return { color: colors.danger };
  if (pct >= 70) return { color: colors.warning };
  return { color: colors.success };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  hint: {
    color: colors.mutedLight,
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentLight,
  },
  error: { color: colors.danger, fontSize: 14 },
  ok: { color: colors.success, fontSize: 14 },
  section: { gap: 8 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  loadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  loadName: { color: colors.text, fontSize: 14, flex: 1 },
  loadPct: { fontSize: 13, fontWeight: '600' },
  suggestion: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 4,
  },
  sugTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  sugMeta: { color: colors.muted, fontSize: 13 },
  applyBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  applyBusy: { opacity: 0.7 },
  applyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
