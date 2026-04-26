import DevWorkspaceClient from './DevWorkspaceClient';
import { scanDevProjects } from '@/lib/dev/scan-projects';

export const dynamic = 'force-dynamic';

export default async function DevWorkspacePage() {
  const { root, projects } = await scanDevProjects();
  return <DevWorkspaceClient initialData={{ root, projects }} />;
}
