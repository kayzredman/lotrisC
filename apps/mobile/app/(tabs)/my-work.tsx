import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { EmptyState } from '@/components/status-chip';
import { LoadingView } from '@/components/loading-view';
import { SegmentedControl } from '@/components/segmented-control';
import { StatTile } from '@/components/stat-tile';
import { TicketRow } from '@/components/ticket-row';
import { ACTIVE_STATUSES } from '@/lib/format';
import { computeMyWorkStats } from '@/lib/my-work-stats';
import { fetchMyTickets } from '@/lib/tickets-api';
import { useAuth } from '@/lib/auth-context';
import type { TicketDto } from '@/lib/types';
import { colors } from '@/lib/theme';

type MyWorkSegment = 'Work' | 'Today';

export default function MyWorkScreen() {
  const { accessToken } = useAuth();
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [segment, setSegment] = useState<MyWorkSegment>('Work');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => computeMyWorkStats(tickets), [tickets]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    try {
      const page = await fetchMyTickets(accessToken);
      const active = page.rows.filter((t) => ACTIVE_STATUSES.has(t.status) || t.status === 'NEW');
      setTickets(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

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

  if (loading && !refreshing) return <LoadingView />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <SegmentedControl
        segments={['Work', 'Today'] as const}
        value={segment}
        onChange={setSegment}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {segment === 'Work' ? (
        tickets.length === 0 ? (
          <EmptyState message="No active tickets assigned to you." />
        ) : (
          tickets.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              onPress={() => router.push(`/ticket/${ticket.id}`)}
              subtitle={ticket.teamName ?? undefined}
            />
          ))
        )
      ) : (
        <TodayView stats={stats} />
      )}
    </ScrollView>
  );
}

function TodayView({ stats }: { stats: ReturnType<typeof computeMyWorkStats> }) {
  return (
    <View style={styles.today}>
      <View style={styles.tiles}>
        <StatTile label="Open" value={stats.open} tone="accent" />
        <StatTile label="In progress" value={stats.inProgress} />
        <StatTile label="SLA at risk" value={stats.atRisk} tone={stats.atRisk > 0 ? 'danger' : 'success'} />
        <StatTile label="Due today" value={stats.dueToday} tone={stats.dueToday > 0 ? 'warning' : 'default'} />
      </View>

      <Text style={styles.sectionTitle}>Needs attention</Text>
      {stats.atRiskTickets.length === 0 ? (
        <EmptyState message="No SLA warnings on your active tickets." />
      ) : (
        stats.atRiskTickets.map((ticket) => (
          <TicketRow
            key={ticket.id}
            ticket={ticket}
            onPress={() => router.push(`/ticket/${ticket.id}`)}
            subtitle={ticket.slaWarningLevel ?? 'SLA breach'}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  error: { color: colors.danger, marginBottom: 8 },
  today: { gap: 12 },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 4,
  },
});
