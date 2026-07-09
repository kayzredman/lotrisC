import { StyleSheet, Text, View } from 'react-native';
import { LotrisMark } from '@/components/lotris-mark';
import { colors } from '@/lib/theme';

interface LotrisHeaderProps {
  title: string;
  subtitle?: string;
}

export function LotrisHeader({ title, subtitle }: LotrisHeaderProps) {
  return (
    <View style={styles.root}>
      <LotrisMark size="sm" />
      <View style={styles.textBlock}>
        <Text style={styles.eyebrow}>LOTRIS · Pager</Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function LotrisBrandStrip({ label }: { label?: string }) {
  return (
    <View style={styles.strip}>
      <LotrisMark size="sm" showWordmark />
      {label ? <Text style={styles.stripLabel}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  textBlock: {
    flex: 1,
    gap: 0,
  },
  eyebrow: {
    color: colors.accentLight,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.mutedLight,
    fontSize: 11,
    marginTop: 1,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  stripLabel: {
    color: colors.mutedLight,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
