import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { scanDevEnvRelations } from '@/lib/dev/scan-env';
import RelationsClient from './RelationsClient';

export const dynamic = 'force-dynamic';

export default async function RelationsPage() {
  const data = await scanDevEnvRelations();

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/dev"
          className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={12} />
          <span>Dev Workspace</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">프로젝트 관계도</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          .env 파일 기반 프로젝트 간 의존성 + 공유 리소스 분석 ·{' '}
          <span className="text-gray-400">값은 해시만 비교 (원문 노출 없음)</span>
        </p>
      </div>
      <RelationsClient projects={data.projects} env={data.env} />
    </div>
  );
}
