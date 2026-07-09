import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

interface StatTileProps {
  label: string;
  value: number | string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
}

const TONE_COLORS = {
  default: colors.text,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  accent: colors.accentLight,
} as const;

export function StatTile({ label, value, tone = 'default' }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.value, { color: TONE_COLORS[tone] }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 4,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    color: colors.mutedLight,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
