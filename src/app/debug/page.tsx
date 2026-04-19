'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [localStorageData, setLocalStorageData] = useState<Record<string, any>>({});

  useEffect(() => {
    const data: Record<string, any> = {};

    // localStorage의 모든 키 확인
    const keys = [
      'video-moment-projects',
      'video-moment-clients',
      'video-moment-partners',
      'video-moment-portfolio',
      'video-moment-episodes',
    ];

    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch (e) {
          data[key] = value;
        }
      } else {
        data[key] = null;
      }
    });

    setLocalStorageData(data);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">localStorage 디버그</h1>

        {Object.entries(localStorageData).map(([key, value]) => (
          <div key={key} className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">{key}</h2>
            <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
              <pre className="text-xs">
                {value === null
                  ? '❌ 데이터 없음'
                  : JSON.stringify(value, null, 2)
                }
              </pre>
            </div>
            {Array.isArray(value) && (
              <p className="mt-2 text-sm text-gray-600">
                총 {value.length}개 항목
              </p>
            )}
          </div>
        ))}

        <div className="mt-8">
          <a
            href="/management"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-800 transition-colors inline-block"
          >
            ← 매니지먼트로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
