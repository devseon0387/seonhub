'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyProfile, getAllUserProfiles, updateUserRole, updateUserApproval, getCustomRoles, addCustomRole, deleteCustomRole } from '@/lib/supabase/db';
import { Shield, Users, Crown, Copy, Check, Plus, X, Tag, Trash2, UserCheck, Clock, Pencil, XCircle, Eye, EyeOff } from 'lucide-react';

type UserProfile = {
  id: string;
  role: string;
  name: string | null;
  email?: string;
  approved?: boolean;
};

const DEFAULT_ROLES = [
  { value: 'admin', label: '대표' },
  { value: 'manager', label: '총괄 매니저' },
];

const ROLE_BADGE_CLASSES: Record<string, string> = {
  admin: 'bg-orange-100 text-orange-700 border border-orange-200',
  manager: 'bg-orange-100 text-orange-700 border border-orange-200',
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 수정 모달
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPw, setShowEditPw] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const profile = await getMyProfile();
      if (!profile || profile.role !== 'admin') {
        router.replace('/management');
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

  const pendingProfiles = profiles.filter(p => p.approved !== true && p.role !== 'admin');
  const approvedProfiles = profiles.filter(p => p.approved === true || p.role === 'admin');

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

  const handleDeleteUser = async (userId: string, name: string | null) => {
    const label = name || '이 계정';
    if (!confirm(`정말 "${label}"을(를) 삭제하시겠습니까?\n삭제하면 로그인도 불가능해집니다.`)) return;

    setDeletingId(userId);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setProfiles(prev => prev.filter(p => p.id !== userId));
      } else {
        const data = await res.json();
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
    setDeletingId(null);
  };

  const handleApproval = async (userId: string, approved: boolean) => {
    const ok = await updateUserApproval(userId, approved);
    if (ok) {
      setProfiles(prev =>
        prev.map(p => (p.id === userId ? { ...p, approved } : p))
      );
    } else {
      alert('승인 상태 변경에 실패했습니다.');
    }
  };

  const handleReject = async (userId: string, name: string | null) => {
    const label = name || '이 계정';
    if (!confirm(`"${label}"의 가입 신청을 거절하시겠습니까?\n계정이 삭제됩니다.`)) return;
    await handleDeleteUser(userId, name);
  };

  const openEditModal = (profile: UserProfile) => {
    setEditingUser(profile);
    setEditName(profile.name ?? '');
    setEditEmail(profile.email ?? '');
    setEditPassword('');
    setShowEditPw(false);
  };

  const handleEditSave = async () => {
    if (!editingUser) return;
    setEditSaving(true);
    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          name: editName.trim() || null,
          email: editEmail.trim() || undefined,
          password: editPassword || undefined,
        }),
      });
      if (res.ok) {
        setProfiles(prev =>
          prev.map(p =>
            p.id === editingUser.id
              ? { ...p, name: editName.trim() || null, email: editEmail.trim() || p.email }
              : p
          )
        );
        setEditingUser(null);
      } else {
        const data = await res.json();
        alert(data.error || '수정에 실패했습니다.');
      }
    } catch {
      alert('수정 중 오류가 발생했습니다.');
    }
    setEditSaving(false);
  };

  const allRoleOptions = [
    ...DEFAULT_ROLES,
    ...customRoles.map(r => ({ value: r, label: r })),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-orange-100 rounded-xl">
          <Shield size={24} className="text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">계정 관리</h1>
          <p className="text-sm text-gray-500 mt-1">대표만 접근 가능한 페이지입니다</p>
        </div>
      </div>

      {/* 가입 신청 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock size={18} className="text-amber-500" />
          <h2 className="text-base font-semibold text-gray-800">가입 신청</h2>
          {pendingProfiles.length > 0 && (
            <span className="ml-auto text-xs font-semibold text-white bg-amber-500 px-2.5 py-1 rounded-full">
              {pendingProfiles.length}
            </span>
          )}
        </div>

        <div className="divide-y divide-gray-100">
          {pendingProfiles.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              대기 중인 가입 신청이 없습니다.
            </div>
          ) : (
            pendingProfiles.map(profile => (
              <div key={profile.id} className="px-6 py-4 flex items-center gap-4">
                {/* 아바타 */}
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-semibold text-sm flex-shrink-0">
                  {(profile.name ?? profile.email ?? '?').charAt(0).toUpperCase()}
                </div>

                {/* 이름/이메일 */}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 text-sm truncate block">
                    {profile.name ?? '(이름 없음)'}
                  </span>
                  {profile.email && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{profile.email}</p>
                  )}
                </div>

                {/* 승인/거절 버튼 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApproval(profile.id, true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors shadow-sm"
                  >
                    <UserCheck size={14} />
                    승인
                  </button>
                  <button
                    onClick={() => handleReject(profile.id, profile.name)}
                    disabled={deletingId === profile.id}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    거절
                  </button>
                </div>
              </div>
            ))
          )}
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
              className="flex-1 text-sm px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <button
              onClick={handleAddRole}
              disabled={addingRole || !newRoleName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={15} />
              추가
            </button>
          </div>
        </div>
      </div>

      {/* 등록된 계정 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users size={18} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">등록된 계정</h2>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {approvedProfiles.length}명
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {approvedProfiles.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              등록된 계정이 없습니다.
            </div>
          ) : (
            approvedProfiles.map(profile => {
              const isMe = profile.id === myId;
              const roleBadge = getRoleBadgeClass(profile.role);
              const roleLabel = getRoleLabel(profile.role, customRoles);

              return (
                <div key={profile.id} className="px-6 py-4 flex items-center gap-4">
                  {/* 아바타 */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
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

                  {/* 역할 배지 + 액션 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isMe ? (
                      <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${roleBadge}`}>
                        {roleLabel}
                      </span>
                    ) : (
                      <>
                        <div className="relative">
                          <select
                            value={profile.role}
                            disabled={updatingId === profile.id}
                            onChange={e => handleRoleChange(profile.id, e.target.value)}
                            className={`
                              text-xs font-medium px-3 py-1.5 rounded-full border appearance-none cursor-pointer
                              focus:outline-none focus:ring-2 focus:ring-orange-300
                              ${roleBadge}
                              ${updatingId === profile.id ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                          >
                            {allRoleOptions.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => openEditModal(profile)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-orange-500 hover:bg-orange-50 transition-all"
                          title="계정 수정"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleApproval(profile.id, false)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition-all"
                          title="승인 취소"
                        >
                          <UserCheck size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(profile.id, profile.name)}
                          disabled={deletingId === profile.id}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                          title="계정 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
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

      {/* 계정 수정 모달 */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
            />
            <motion.div
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
            >
              {/* 모달 헤더 */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">계정 수정</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{editingUser.name ?? editingUser.email}</p>
                </div>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              {/* 모달 바디 */}
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">이름</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                    placeholder="이름"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                    placeholder="이메일"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">새 비밀번호</label>
                  <div className="relative">
                    <input
                      type={showEditPw ? 'text' : 'password'}
                      value={editPassword}
                      onChange={e => setEditPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                      placeholder="변경하지 않으려면 비워두세요"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showEditPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">최소 6자 이상</p>
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={editSaving}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
