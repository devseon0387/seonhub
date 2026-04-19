import ERDView from '@/components/ERDView';
import { ERD } from '@/erd/erd';

export const metadata = {
  title: 'ERD | SEON Hub',
};

export default function ERDPage() {
  return <ERDView erd={ERD} />;
}
