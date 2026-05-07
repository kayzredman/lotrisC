import { Metadata } from 'next';
import QueueTableWrapper from '@/components/queue/queue-table';

export const metadata: Metadata = {
  title: 'Queue | Lotris',
  description: "Your team's unassigned tickets — ordered by priority and pickup SLA",
};

export default function QueuePage() {
  return <QueueTableWrapper />;
}
