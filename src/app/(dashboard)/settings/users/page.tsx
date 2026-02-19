'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyProfile, getAllUserProfiles, updateUserRole, getCustomRoles, addCustomRole, deleteCustomRole } from '@/lib/supabase/db';
import { Shield, Users, Crown, Copy, Check, Plus, X, Tag } from 'lucide-react';

type UserProfile = {
  id: string;
  role: string;
  name: string | null;
  email?: string;
};

const DEFAULT_ROLES = [
  { value: 'admin', label: '대표' },
  { value: 'manager', label: '총괄 매니저' },
];

const ROLE_BADGE_CLASSES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border border-purple-200',
  manager: 'bg-blue-100 text-blue-700 border border-blue-200',
};

function getRoleBadgeClass(role: string) {
  return ROLE_BADGE_CLASSES[role] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
}

function getRoleLabel(role: string, customRoles: string[]) {
  if (role === 'admin') return '대표';
  if (role === 'manager') return '총괄 매니저';
  if (customRoles.includes(role)) return role;
  return role;
}

export default function UsersSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string>('');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [addingRole, setAddingRole] = useState(false);

  useEffect(() => {
    const init = async () => {
      const profile = await getMyProfile();
      if (!profile || profile.role !== 'admin') {
        router.replace('/dashboard');
        return;
      }
      setMyId(profile.id);

      const [all, roles] = await Promise.all([getAllUserProfiles(), getCustomRoles()]);
      setProfiles(all);
      setCustomRoles(roles);
      setLoading(false);
    };
    init();
  }, [router]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    const ok = await updateUserRole(userId, newRole);
    if (ok) {
      setProfiles(prev =>
        prev.map(p => (p.id === userId ? { ...p, role: newRole } : p))
      );
    } else {
      alert('역할 변경에 실패했습니다. 다시 시도해주세요.');
    }
    setUpdatingId(null);
  };

  const handleAddRole = async () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) return;
    if (trimmed === '대표' || trimmed === '총괄 매니저') return;
    if (customRoles.includes(trimmed)) return;

    setAddingRole(true);
    const ok = await addCustomRole(trimmed);
    if (ok) {
      setCustomRoles(prev => [...prev, trimmed]);
      setNewRoleName('');
    } else {
      alert('역할 추가에 실패했습니다. 다시 시도해주세요.');
    }
    setAddingRole(false);
  };

  const handleDeleteRole = async (name: string) => {
    const ok = await deleteCustomRole(name);
    if (ok) {
      setCustomRoles(prev => prev.filter(r => r !== name));
    } else {
      alert('역할 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleCopyInviteLink = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const signupUrl = `${origin}/signup`;
    try {
      await navigator.clipboard.writeText(signupUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = signupUrl;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const allRoleOptions = [
    ...DEFAULT_ROLES,
    ...customRoles.map(r => ({ value: r, label: r })),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-purple-100 rounded-xl">
          <Shield size={24} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">계정 관리</h1>
          <p className="text-sm text-gray-500 mt-1">대표만 접근 가능한 페이지입니다</p>
        </div>
      </div>

      {/* 역할 관리 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Tag size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">역할 관리</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* 기본 역할 */}
          <div>
            <p className="text-xs text-gray-400 font-medium mb-2">기본 역할 (변경 불가)</p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_ROLES.map(r => (
                <span key={r.value} className={`text-xs font-medium px-3 py-1.5 rounded-full ${getRoleBadgeClass(r.value)}`}>
                  {r.label}
                </span>
              ))}
            </div>
          </div>

          {/* 커스텀 역할 */}
          <div>
            <p className="text-xs text-gray-400 font-medium mb-2">커스텀 역할</p>
            {customRoles.length === 0 ? (
              <p className="text-sm text-gray-400">아직 추가된 역할이 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {customRoles.map(role => (
                  <div key={role} className="flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-200 text-xs font-medium px-3 py-1.5 rounded-full">
                    <span>{role}</span>
                    <button
                      onClick={() => handleDeleteRole(role)}
                      className="ml-1 hover:text-red-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 역할 추가 */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddRole(); }}
              placeholder="새 역할 이름 (예: PD, 에디터)"
              className="flex-1 text-sm px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              onClick={handleAddRole}
              disabled={addingRole || !newRoleName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={15} />
              추가
            </button>
          </div>
        </div>
      </div>

      {/* 유저 목록 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">등록된 계정</h2>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {profiles.length}명
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {profiles.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              등록된 계정이 없습니다.
            </div>
          ) : (
            profiles.map(profile => {
              const isMe = profile.id === myId;
              const roleBadge = getRoleBadgeClass(profile.role);
              const roleLabel = getRoleLabel(profile.role, customRoles);

              return (
                <div key={profile.id} className="px-6 py-4 flex items-center gap-4">
                  {/* 아바타 */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {profile.role === 'admin' ? (
                      <Crown size={16} />
                    ) : (
                      (profile.name ?? profile.email ?? '?').charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* 이름/이메일 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {profile.name ?? '(이름 없음)'}
                      </span>
                      {isMe && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">나</span>
                      )}
                    </div>
                    {profile.email && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{profile.email}</p>
                    )}
                  </div>

                  {/* 역할 배지 + 변경 */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isMe ? (
                      <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${roleBadge}`}>
                        {roleLabel}
                      </span>
                    ) : (
                      <div className="relative">
                        <select
                          value={profile.role}
                          disabled={updatingId === profile.id}
                          onChange={e => handleRoleChange(profile.id, e.target.value)}
                          className={`
                            text-xs font-medium px-3 py-1.5 rounded-full border appearance-none cursor-pointer
                            focus:outline-none focus:ring-2 focus:ring-blue-300
                            ${roleBadge}
                            ${updatingId === profile.id ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          {allRoleOptions.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 새 계정 초대 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">새 계정 초대</h2>
          <p className="text-sm text-gray-500 mt-1">
            아래 회원가입 링크를 복사해서 초대할 팀원에게 공유하세요.
          </p>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <code className="flex-1 text-sm text-gray-600 truncate font-mono">
              {typeof window !== 'undefined' ? `${window.location.origin}/signup` : '/signup'}
            </code>
            <button
              onClick={handleCopyInviteLink}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${copied
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }
              `}
            >
              {copied ? (
                <>
                  <Check size={15} />
                  복사됨
                </>
              ) : (
                <>
                  <Copy size={15} />
                  링크 복사
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
