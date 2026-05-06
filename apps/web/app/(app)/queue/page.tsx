import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Queue | Lotris',
  description: "Your team's unassigned tickets — ordered by priority and pickup SLA",
};

export default function QueuePage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your team&apos;s unassigned tickets — ordered by priority and pickup SLA deadline.
        </p>
      </div>

      {/* Dynamically imported to keep the RSC shell light */}
      <QueueTableWrapper />
    </div>
  );
}

// Import client component inline — avoids a separate barrel
import QueueTableWrapper from '@/components/queue/queue-table';
