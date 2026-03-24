'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Wrench, Zap, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_VERSION } from '@/config/version';
import { defaultChangelogs, type UpdateType } from '@/config/changelog';

const SEEN_KEY = 'vimo-seen-version';

const TYPE_ICONS: Record<UpdateType, React.ReactNode> = {
  feature: <Sparkles size={14} />,
  fix: <Wrench size={14} />,
  improvement: <Zap size={14} />,
  breaking: <AlertCircle size={14} />,
};

const TYPE_STYLES: Record<UpdateType, { label: string; color: string; bg: string }> = {
  feature: { label: '새 기능', color: 'text-orange-700', bg: 'bg-orange-100' },
  fix: { label: '버그 수정', color: 'text-red-700', bg: 'bg-red-100' },
  improvement: { label: '개선', color: 'text-green-700', bg: 'bg-green-100' },
  breaking: { label: '주요 변경', color: 'text-orange-700', bg: 'bg-orange-100' },
};

export default function UpdateNoticeModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(SEEN_KEY);
    if (seen !== APP_VERSION) {
      setShow(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(SEEN_KEY, APP_VERSION);
    setShow(false);
  };

  const latest = defaultChangelogs[0];
  if (!latest) return null;

  const style = TYPE_STYLES[latest.type];

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed z-[10000] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-gray-100 w-[440px] max-w-[92vw] max-h-[80vh] flex flex-col"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Sparkles size={20} className="text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">업데이트 알림</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono font-bold text-gray-400">{latest.version}</span>
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.color}`}>
                      {TYPE_ICONS[latest.type]}
                      {style.label}
                    </span>
                    <span className="text-[10px] text-gray-400">{latest.date}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {/* 본문 */}
            <div className="px-6 pb-2 flex-1 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{latest.title}</h3>
              {latest.description && (
                <p className="text-xs text-gray-500 mb-4">{latest.description}</p>
              )}

              <ul className="space-y-2">
                {latest.details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 border-t border-gray-100">
              <button
                onClick={handleClose}
                className="w-full py-2.5 bg-orange-500 text-white rounded-xl font-medium text-sm hover:bg-orange-600 transition-colors"
              >
                확인
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
