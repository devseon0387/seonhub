import RoadmapView from '@/components/RoadmapView';
import { ROADMAP } from '@/roadmap/roadmap';

export const metadata = {
  title: '로드맵 | SEON Hub',
};

export default function RoadmapPage() {
  return <RoadmapView roadmap={ROADMAP} />;
}
