import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusChip } from '@/components/status-chip';
import { formatWhen, ticketLabel } from '@/lib/format';
import type { QueueTicket, TicketDto } from '@/lib/types';
import { colors } from '@/lib/theme';

type TicketRowProps = {
  ticket: TicketDto | QueueTicket;
  onPress: () => void;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionBusy?: boolean;
};

export function TicketRow({
  ticket,
  onPress,
  subtitle,
  actionLabel,
  onAction,
  actionBusy,
}: TicketRowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={2}>
          {ticketLabel(ticket)}
        </Text>
        <View style={styles.meta}>
          <StatusChip status={ticket.status} />
          {'teamName' in ticket && ticket.teamName ? (
            <Text style={styles.team}>{ticket.teamName}</Text>
          ) : null}
        </View>
        <Text style={styles.time}>{subtitle ?? formatWhen(ticket.createdAt)}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          style={[styles.action, actionBusy && styles.actionBusy]}
          onPress={(e) => {
            e.stopPropagation?.();
            onAction();
          }}
          disabled={actionBusy}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  main: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  team: {
    color: colors.muted,
    fontSize: 12,
  },
  time: {
    color: colors.muted,
    fontSize: 12,
  },
  action: {
    backgroundColor: colors.accentMuted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionBusy: {
    opacity: 0.6,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
