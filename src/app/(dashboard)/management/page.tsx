import ManagementTabs from './ManagementTabs';
import { getManagementInitialData } from '@/lib/supabase/db/bootstrap';

export const dynamic = 'force-dynamic';

export default async function ManagementPage() {
  const initialData = await getManagementInitialData();
  const todayLabel = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return <ManagementTabs initialData={initialData} todayLabel={todayLabel} />;
}
