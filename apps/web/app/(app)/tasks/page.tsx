import { Metadata } from 'next';
import TasksTable from '@/components/tasks/tasks-table';

export const metadata: Metadata = {
  title: 'Tasks | Lotris',
  description: 'Lead-assigned and self-logged tasks — track progress and checklists.',
};

export default function TasksPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track lead-assigned work and your own self-logged tasks.
        </p>
      </div>
      <TasksTable />
    </div>
  );
}
