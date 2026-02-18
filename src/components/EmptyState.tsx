'use client';

import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  iconColor?: string;
  iconBgColor?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconColor = 'text-gray-400',
  iconBgColor = 'bg-gray-100',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      {/* 아이콘 */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className={`w-20 h-20 ${iconBgColor} rounded-full flex items-center justify-center mb-6 shadow-sm`}
      >
        <Icon size={40} className={iconColor} />
      </motion.div>

      {/* 텍스트 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center max-w-md"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{description}</p>
      </motion.div>

      {/* 액션 버튼 */}
      {action && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={action.onClick}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-lg hover:shadow-xl"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}

// 프리셋 빈 상태 컴포넌트들
export function EmptyProjects({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={require('lucide-react').FolderOpen}
      title="프로젝트가 없습니다"
      description="새 프로젝트를 추가하여 비디오 작업을 시작하세요. 프로젝트를 통해 클라이언트, 파트너, 에피소드를 관리할 수 있습니다."
      action={
        onAdd
          ? {
              label: '+ 프로젝트 추가하기',
              onClick: onAdd,
            }
          : undefined
      }
      iconColor="text-purple-500"
      iconBgColor="bg-purple-50"
    />
  );
}

export function EmptyEpisodes({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={require('lucide-react').Film}
      title="에피소드가 없습니다"
      description="프로젝트에 에피소드를 추가하여 작업을 시작하세요. 각 에피소드는 개별적으로 관리됩니다."
      action={
        onAdd
          ? {
              label: '+ 에피소드 추가하기',
              onClick: onAdd,
            }
          : undefined
      }
      iconColor="text-blue-500"
      iconBgColor="bg-blue-50"
    />
  );
}

export function EmptyPartners({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={require('lucide-react').Users}
      title="등록된 파트너가 없습니다"
      description="비디오 작업을 함께할 파트너를 추가하세요. 편집자, 촬영감독 등 다양한 전문가를 관리할 수 있습니다."
      action={
        onAdd
          ? {
              label: '+ 파트너 추가하기',
              onClick: onAdd,
            }
          : undefined
      }
      iconColor="text-green-500"
      iconBgColor="bg-green-50"
    />
  );
}

export function EmptyClients({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={require('lucide-react').Briefcase}
      title="등록된 클라이언트가 없습니다"
      description="프로젝트를 의뢰하는 클라이언트를 추가하세요. 클라이언트별로 프로젝트를 관리할 수 있습니다."
      action={
        onAdd
          ? {
              label: '+ 클라이언트 추가하기',
              onClick: onAdd,
            }
          : undefined
      }
      iconColor="text-orange-500"
      iconBgColor="bg-orange-50"
    />
  );
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon={require('lucide-react').SearchX}
      title="검색 결과가 없습니다"
      description={`"${query}"에 대한 검색 결과를 찾을 수 없습니다. 다른 키워드로 검색해보세요.`}
      iconColor="text-gray-400"
      iconBgColor="bg-gray-100"
    />
  );
}

export function EmptyTrash() {
  return (
    <EmptyState
      icon={require('lucide-react').Trash2}
      title="휴지통이 비어있습니다"
      description="삭제된 항목이 없습니다. 삭제한 프로젝트나 에피소드가 여기에 표시됩니다."
      iconColor="text-gray-400"
      iconBgColor="bg-gray-100"
    />
  );
}

export function EmptyReviews() {
  return (
    <EmptyState
      icon={require('lucide-react').CheckCircle}
      title="검수 대기 중인 작업이 없습니다"
      description="모든 작업이 완료되었거나 아직 검수 단계에 도달하지 않았습니다."
      iconColor="text-green-400"
      iconBgColor="bg-green-50"
    />
  );
}

export function EmptyDeadlines() {
  return (
    <EmptyState
      icon={require('lucide-react').Calendar}
      title="다가오는 마감일이 없습니다"
      description="7일 이내에 마감되는 작업이 없습니다. 여유롭게 작업을 진행하세요!"
      iconColor="text-blue-400"
      iconBgColor="bg-blue-50"
    />
  );
}
