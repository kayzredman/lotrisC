import { Metadata } from 'next';
import KnowledgeList from '@/components/knowledge/knowledge-list';

export const metadata: Metadata = { title: 'Knowledge | Lotris' };

export default function KnowledgePage() {
  return <KnowledgeList />;
}
