import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

interface SegmentedControlProps<T extends string> {
  segments: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.root}>
      {segments.map((segment) => {
        const active = segment === value;
        return (
          <Pressable
            key={segment}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(segment)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{segment}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 3,
    marginBottom: 14,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  label: {
    color: colors.mutedLight,
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.text,
  },
});
