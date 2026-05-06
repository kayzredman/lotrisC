import { redirect } from 'next/navigation';

/** Root / redirects authenticated users to the dashboard. */
export default function HomePage() {
  redirect('/dashboard');
}
