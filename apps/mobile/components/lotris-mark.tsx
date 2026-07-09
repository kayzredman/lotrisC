import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

type MarkSize = 'sm' | 'md' | 'lg';

const SIZES: Record<MarkSize, { panel: { w: number; h: number }; dot: number; gap: number }> = {
  sm: { panel: { w: 44, h: 28 }, dot: 10, gap: 4 },
  md: { panel: { w: 56, h: 36 }, dot: 12, gap: 5 },
  lg: { panel: { w: 72, h: 46 }, dot: 15, gap: 6 },
};

interface LotrisMarkProps {
  size?: MarkSize;
  showWordmark?: boolean;
}

export function LotrisMark({ size = 'md', showWordmark = false }: LotrisMarkProps) {
  const dims = SIZES[size];

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.panel,
          { width: dims.panel.w, height: dims.panel.h, gap: dims.gap, paddingHorizontal: dims.gap + 2 },
        ]}
      >
        <StatusDot color={colors.danger} dim size={dims.dot} />
        <StatusDot color={colors.warning} dim size={dims.dot} />
        <StatusDot color={colors.success} size={dims.dot} />
      </View>
      {showWordmark ? (
        <View style={styles.wordmarkBlock}>
          <Text style={[styles.wordmark, size === 'sm' && styles.wordmarkSm]}>LOTRIS</Text>
          {size !== 'sm' ? <Text style={styles.tagline}>Pager</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function StatusDot({
  color,
  size,
  dim = false,
}: {
  color: string;
  size: number;
  dim?: boolean;
}) {
  return (
    <View
      style={[
        styles.dotOuter,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          opacity: dim ? 0.75 : 1,
        },
      ]}
    >
      <View
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: size * 0.31,
          backgroundColor: color,
          opacity: dim ? 0.45 : 0.95,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  wordmarkBlock: {
    gap: 0,
  },
  wordmark: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  wordmarkSm: {
    fontSize: 14,
    letterSpacing: 1,
  },
  tagline: {
    color: colors.accentLight,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: -2,
  },
});
