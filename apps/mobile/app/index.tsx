import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import LoginScreen from '@/components/login-screen';
import { LoadingView } from '@/components/loading-view';

export default function Index() {
  const { accessToken, isLoading } = useAuth();

  if (isLoading) return <LoadingView />;
  if (accessToken) return <Redirect href="/(tabs)/my-work" />;

  return <LoginScreen />;
}
