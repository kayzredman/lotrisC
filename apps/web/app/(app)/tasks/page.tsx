import { Metadata } from 'next';
import TasksTable from '@/components/tasks/tasks-table';

export const metadata: Metadata = {
  title: 'Tasks | Lotris',
};

export default function TasksPage() {
  return <TasksTable />;
}
