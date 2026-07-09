import { StyleSheet, Text, View } from 'react-native';
import { formatStatus, statusColor } from '@/lib/format';
import { colors } from '@/lib/theme';

export function StatusChip({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{formatStatus(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={empty.root}>
      <Text style={empty.text}>{message}</Text>
    </View>
  );
}

const empty = StyleSheet.create({
  root: {
    padding: 32,
    alignItems: 'center',
  },
  text: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
