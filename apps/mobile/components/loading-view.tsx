import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LotrisMark } from '@/components/lotris-mark';
import { colors } from '@/lib/theme';

export function LoadingView() {
  return (
    <View style={styles.root}>
      <LotrisMark size="lg" showWordmark />
      <ActivityIndicator color={colors.accent} size="large" style={styles.spinner} />
      <Text style={styles.caption}>Loading Lotris Pager…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    gap: 16,
  },
  spinner: {
    marginTop: 8,
  },
  caption: {
    color: colors.mutedLight,
    fontSize: 13,
    fontWeight: '500',
  },
});
