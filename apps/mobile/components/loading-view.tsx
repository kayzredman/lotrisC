import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';

export function LoadingView() {
  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
});
