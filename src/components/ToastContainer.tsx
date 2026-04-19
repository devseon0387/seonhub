'use client';

import { useToast, Toast as ToastType } from '@/contexts/ToastContext';
import { XCircle, AlertTriangle, Info, X, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function Toast({ toast, onClose }: { toast: ToastType; onClose: () => void }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;
    const timer = setTimeout(onClose, toast.duration);

    // 프로그레스 바 애니메이션
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration!) * 100);
      setProgress(remaining);
    }, 30);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [toast.duration, onClose]);

  const getAccentColor = () => {
    switch (toast.type) {
      case 'success': return '#34d399';
      case 'error':   return '#f87171';
      case 'warning': return '#fbbf24';
      case 'info':    return '#60a5fa';
    }
  };

  const getIcon = () => {
    const color = getAccentColor();
    switch (toast.type) {
      case 'success': return <Check size={16} style={{ color }} strokeWidth={2.5} />;
      case 'error':   return <XCircle size={16} style={{ color }} />;
      case 'warning': return <AlertTriangle size={16} style={{ color }} />;
      case 'info':    return <Info size={16} style={{ color }} />;
    }
  };

  const accent = getAccentColor();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.92, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 8, scale: 0.95, filter: 'blur(4px)' }}
      transition={{
        layout: { type: 'spring', stiffness: 300, damping: 28 },
        opacity: { duration: 0.25 },
        y: { type: 'spring', stiffness: 350, damping: 26 },
        scale: { type: 'spring', stiffness: 350, damping: 26 },
        filter: { duration: 0.25 },
      }}
      style={{
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(24px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
      }}
      className="pl-4 pr-3 py-3 rounded-xl flex items-center gap-3 min-w-[280px] max-w-sm relative overflow-hidden"
    >
      {/* 왼쪽 액센트 라인 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2.5px] rounded-full"
        style={{ background: accent }}
      />

      {/* 아이콘 */}
      <motion.div
        className="flex-shrink-0"
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.06 }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}18` }}
        >
          {getIcon()}
        </div>
      </motion.div>

      {/* 메시지 */}
      <motion.p
        className="flex-1 text-[13px] font-medium leading-snug"
        style={{ color: 'rgba(0, 0, 0, 0.75)' }}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.2 }}
      >
        {toast.message}
      </motion.p>

      {/* 닫기 */}
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 rounded-md transition-colors"
        style={{ color: 'rgba(0, 0, 0, 0.25)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(0, 0, 0, 0.5)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0, 0, 0, 0.25)')}
      >
        <X size={14} />
      </button>

      {/* 하단 프로그레스 바 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{ background: 'rgba(0, 0, 0, 0.04)' }}
      >
        <div
          className="h-full transition-none"
          style={{
            width: `${progress}%`,
            background: accent,
            opacity: 0.5,
          }}
        />
      </div>
    </motion.div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <motion.div layout className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2.5 items-center">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
