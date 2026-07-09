import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LotrisMark } from '@/components/lotris-mark';
import type { PagerAlert } from '@/lib/pager-types';
import { colors } from '@/lib/theme';

type Props = {
  alert: PagerAlert | null;
  onDismiss: () => void;
};

export default function PagerAlertOverlay({ alert, onDismiss }: Props) {
  if (!alert) return null;

  function openTicket() {
    if (alert?.ticketId) {
      router.push(`/ticket/${alert.ticketId}`);
    }
    onDismiss();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.brandRow}>
            <LotrisMark size="sm" />
            <Text style={styles.badge}>PAGER ALERT</Text>
          </View>
          <Text style={styles.title}>{alert.title}</Text>
          <Text style={styles.body}>{alert.body}</Text>
          <Text style={styles.meta}>{alert.eventType.replace(/_/g, ' ')}</Text>

          <View style={styles.actions}>
            {alert.ticketId ? (
              <Pressable style={styles.primary} onPress={openTicket}>
                <Text style={styles.primaryText}>Open ticket</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.secondary} onPress={onDismiss}>
              <Text style={styles.secondaryText}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: 20,
    gap: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    color: colors.accentLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  body: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  actions: {
    marginTop: 8,
    gap: 10,
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
});
