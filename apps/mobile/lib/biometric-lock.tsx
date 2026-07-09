import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View, type AppStateStatus } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';

const BIOMETRIC_PREF_KEY = 'lotris_biometric_lock';

export async function getBiometricLockEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(BIOMETRIC_PREF_KEY)) === 'true';
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, enabled ? 'true' : 'false');
}

export async function canUseBiometric(): Promise<boolean> {
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hardware && enrolled;
}

interface BiometricLockContextValue {
  enabled: boolean;
  available: boolean;
  setEnabled: (on: boolean) => Promise<void>;
}

const BiometricLockContext = createContext<BiometricLockContextValue | null>(null);

export function BiometricLockProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const [enabled, setEnabledState] = useState(false);
  const [available, setAvailable] = useState(false);
  const [locked, setLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const skipNextLock = useRef(true);

  useEffect(() => {
    void (async () => {
      const [pref, can] = await Promise.all([getBiometricLockEnabled(), canUseBiometric()]);
      setEnabledState(pref && can);
      setAvailable(can);
    })();
  }, []);

  const setEnabled = useCallback(async (on: boolean) => {
    if (on) {
      const can = await canUseBiometric();
      if (!can) return;
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric lock',
        cancelLabel: 'Cancel',
      });
      if (!auth.success) return;
    }
    await setBiometricLockEnabled(on);
    setEnabledState(on);
    if (!on) setLocked(false);
  }, []);

  const unlock = useCallback(async () => {
    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Lotris Pager',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use passcode',
    });
    if (auth.success) {
      setLocked(false);
      skipNextLock.current = true;
    }
  }, []);

  useEffect(() => {
    if (!accessToken || !enabled) {
      setLocked(false);
      return;
    }

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        next === 'active'
      ) {
        if (skipNextLock.current) {
          skipNextLock.current = false;
        } else {
          setLocked(true);
        }
      }
      if (next.match(/inactive|background/)) {
        skipNextLock.current = false;
      }
      appState.current = next;
    });

    return () => sub.remove();
  }, [accessToken, enabled]);

  const value = useMemo(
    () => ({ enabled, available, setEnabled }),
    [enabled, available, setEnabled],
  );

  return (
    <BiometricLockContext.Provider value={value}>
      {children}
      <Modal visible={locked} animationType="fade" transparent>
        <View style={styles.overlay}>
          <Text style={styles.title}>Lotris Pager locked</Text>
          <Text style={styles.sub}>Use Face ID or Touch ID to continue</Text>
          <Pressable style={styles.btn} onPress={() => void unlock()}>
            <Text style={styles.btnText}>Unlock</Text>
          </Pressable>
        </View>
      </Modal>
    </BiometricLockContext.Provider>
  );
}

export function useBiometricLock(): BiometricLockContextValue {
  const ctx = useContext(BiometricLockContext);
  if (!ctx) {
    throw new Error('useBiometricLock must be used within BiometricLockProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5,8,15,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: 15, textAlign: 'center' },
  btn: {
    marginTop: 16,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
