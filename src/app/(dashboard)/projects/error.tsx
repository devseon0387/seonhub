'use client';

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <h2 className="text-2xl font-bold text-stone-900">프로젝트를 불러올 수 없습니다</h2>
      <p className="mt-2 text-sm text-stone-500">
        프로젝트 데이터를 가져오는 중 문제가 발생했습니다.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-xl bg-blue-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}
