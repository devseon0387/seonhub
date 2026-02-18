'use client';

import { useToast, Toast as ToastType } from '@/contexts/ToastContext';
import { XCircle, AlertTriangle, Info, X, Check } from 'lucide-react';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function Toast({ toast, onClose }: { toast: ToastType; onClose: () => void }) {
  // 타이머 만료 시 onClose 직접 호출 → AnimatePresence가 exit 애니메이션 처리
  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;
    const timer = setTimeout(onClose, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  const getGradient = () => {
    switch (toast.type) {
      case 'success': return 'from-green-500/95 to-green-600/95';
      case 'error':   return 'from-red-500/95 to-red-600/95';
      case 'warning': return 'from-amber-500/95 to-orange-500/95';
      case 'info':    return 'from-blue-500/95 to-blue-600/95';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <Check className="w-5 h-5 text-white" strokeWidth={2.5} />;
      case 'error':   return <XCircle className="w-5 h-5 text-white" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-white" />;
      case 'info':    return <Info className="w-5 h-5 text-white" />;
    }
  };

  return (
    <motion.div
      layout                              // 다른 토스트가 사라질 때 이 토스트가 부드럽게 이동
      initial={{ opacity: 0, x: 64, scale: 0.86 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, scale: 0.92 }}
      transition={{
        layout: { type: 'spring', stiffness: 320, damping: 30 },  // 위치 재배치 스프링
        opacity: { duration: 0.25 },
        x: { type: 'spring', stiffness: 380, damping: 28 },
        scale: { type: 'spring', stiffness: 380, damping: 28 },
      }}
      className={`
        bg-gradient-to-r ${getGradient()} backdrop-blur-xl
        text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/20
        flex items-center gap-3 min-w-[280px] max-w-sm
      `}
    >
      <motion.div
        className="flex-shrink-0"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.08 }}
      >
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          {getIcon()}
        </div>
      </motion.div>

      <motion.p
        className="flex-1 text-white font-medium text-sm leading-snug"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.2 }}
      >
        {toast.message}
      </motion.p>

      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
      >
        <X className="w-4 h-4 text-white/80" />
      </button>
    </motion.div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <motion.div layout className="fixed top-4 right-4 z-[200] flex flex-col gap-3 items-end">
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
