import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { EmptyState, StatusChip } from '@/components/status-chip';
import { LoadingView } from '@/components/loading-view';
import { formatWhen, nextActions, ticketLabel } from '@/lib/format';
import {
  addTicketComment,
  fetchTicket,
  fetchTicketComments,
  updateTicketStatus,
} from '@/lib/tickets-api';
import { useAuth } from '@/lib/auth-context';
import type { TicketComment, TicketDto } from '@/lib/types';
import { colors } from '@/lib/theme';

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [ticket, setTicket] = useState<TicketDto | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    setError(null);
    try {
      const [t, c] = await Promise.all([
        fetchTicket(accessToken, id),
        fetchTicketComments(accessToken, id),
      ]);
      setTicket(t);
      setComments(c.filter((x) => !x.isInternal));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

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

  async function onStatus(status: string) {
    if (!accessToken || !id) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateTicketStatus(accessToken, id, status);
      setTicket(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitComment() {
    if (!accessToken || !id || !comment.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addTicketComment(accessToken, id, comment.trim());
      setComment('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comment failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !ticket) return <LoadingView />;
  if (!ticket) {
    return (
      <View style={styles.root}>
        <EmptyState message={error ?? 'Ticket not found'} />
      </View>
    );
  }

  const actions = nextActions(ticket.status);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <Text style={styles.title}>{ticketLabel(ticket)}</Text>
      <StatusChip status={ticket.status} />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Meta label="Team" value={ticket.teamName ?? '—'} />
        <Meta label="Priority" value={String(ticket.priority)} />
        <Meta label="SLA resolve" value={formatWhen(ticket.slaResolutionDeadline)} />
        <Meta label="Updated" value={formatWhen(ticket.updatedAt)} />
      </View>

      {ticket.description ? (
        <View style={styles.card}>
          <Text style={styles.section}>Description</Text>
          <Text style={styles.body}>{ticket.description}</Text>
        </View>
      ) : null}

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.status}
              style={[styles.actionBtn, busy && styles.actionBusy]}
              onPress={() => onStatus(a.status)}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionText}>{a.label}</Text>
              )}
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.section}>Add comment</Text>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder="Update for the ticket…"
          placeholderTextColor={colors.muted}
          multiline
        />
        <Pressable
          style={[styles.actionBtn, (!comment.trim() || busy) && styles.actionBusy]}
          onPress={onSubmitComment}
          disabled={!comment.trim() || busy}
        >
          <Text style={styles.actionText}>Post comment</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Comments ({comments.length})</Text>
      {comments.length === 0 ? (
        <EmptyState message="No comments yet." />
      ) : (
        comments.map((c) => (
          <View key={c.id} style={styles.comment}>
            <Text style={styles.commentMeta}>Comment · {formatWhen(c.createdAt)}</Text>
            <Text style={styles.body}>{c.body}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  section: { color: colors.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  metaLabel: { color: colors.muted, fontSize: 13 },
  metaValue: { color: colors.text, fontSize: 13, flexShrink: 1, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.accentMuted,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBusy: { opacity: 0.6 },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  comment: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 6,
  },
  commentMeta: { color: colors.muted, fontSize: 12 },
});
