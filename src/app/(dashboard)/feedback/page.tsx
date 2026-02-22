'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { getFeedbacks, updateFeedbackStatus } from '@/lib/supabase/db';
import type { Feedback, FeedbackStatus } from '@/types';

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: '대기',
  reviewed: '검토',
  done: '완료',
};

const STATUS_STYLES: Record<FeedbackStatus, { bg: string; text: string }> = {
  pending:  { bg: '#fef9c3', text: '#854d0e' },
  reviewed: { bg: '#dbeafe', text: '#1e40af' },
  done:     { bg: '#dcfce7', text: '#166534' },
};

type FilterTab = 'all' | FeedbackStatus;

export default function FeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    getFeedbacks().then(data => {
      if (!cancelled) { setItems(data); setLoading(false); }
    }).catch(() => {
      if (!cancelled) { toast.error('목록을 불러오지 못했습니다'); setLoading(false); }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    const ok = await updateFeedbackStatus(id, status);
    if (ok) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
      toast.success(`상태가 "${STATUS_LABELS[status]}"(으)로 변경되었습니다`);
    } else {
      toast.error('상태 변경에 실패했습니다');
    }
  };

  const filtered =
    filter === 'all' ? items : items.filter((item) => item.status === filter);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'pending', label: '대기' },
    { key: 'reviewed', label: '검토' },
    { key: 'done', label: '완료' },
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1c1917', marginBottom: '24px' }}>
        개선사항
      </h1>

      {/* 필터 탭 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {tabs.map((tab) => {
          const count =
            tab.key === 'all'
              ? items.length
              : items.filter((i) => i.status === tab.key).length;
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: isActive ? '#1c1917' : '#f5f3f1',
                color: isActive ? '#fff' : '#78716c',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#a8a29e', fontSize: '14px' }}>
          불러오는 중...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>💡</div>
          <p style={{ color: '#a8a29e', fontSize: '14px' }}>
            {filter === 'all'
              ? '아직 등록된 개선사항이 없습니다.'
              : `"${STATUS_LABELS[filter as FeedbackStatus]}" 상태의 개선사항이 없습니다.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((item) => {
            const style = STATUS_STYLES[item.status];
            return (
              <div
                key={item.id}
                style={{
                  background: '#fff',
                  border: '1px solid #ede9e6',
                  borderRadius: '14px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', color: '#1c1917', whiteSpace: 'pre-line', marginBottom: '12px', lineHeight: 1.6 }}>
                      {item.content}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#a8a29e' }}>
                      <span>{item.pagePath}</span>
                      <span>·</span>
                      <span>
                        {new Date(item.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: style.bg,
                        color: style.text,
                      }}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                    <select
                      value={item.status}
                      onChange={(e) =>
                        handleStatusChange(item.id, e.target.value as FeedbackStatus)
                      }
                      style={{
                        fontSize: '12px',
                        border: '1px solid #ede9e6',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        color: '#78716c',
                        background: '#fff',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="pending">대기</option>
                      <option value="reviewed">검토</option>
                      <option value="done">완료</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
