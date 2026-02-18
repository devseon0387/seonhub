'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getMyProfile, getAllUserProfiles, updateUserRole } from '@/lib/supabase/db';
import { Shield, Users, Crown, Copy, Check } from 'lucide-react';

type UserProfile = {
  id: string;
  role: string;
  name: string | null;
  email?: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: '대표',
  manager: '총괄 매니저',
};

const ROLE_BADGE_CLASSES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border border-purple-200',
  manager: 'bg-blue-100 text-blue-700 border border-blue-200',
};

export default function UsersSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string>('');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
      const profile = await getMyProfile();
      if (!profile || profile.role !== 'admin') {
        router.replace('/dashboard');
        return;
      }
      setMyId(profile.id);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setMyId(user.id);

      const all = await getAllUserProfiles();
      setProfiles(all);
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
    }
    setUpdatingId(null);
  };

  const handleCopyInviteLink = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const signupUrl = `${origin}/signup`;
    try {
      await navigator.clipboard.writeText(signupUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

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
              const roleBadge = ROLE_BADGE_CLASSES[profile.role] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
              const roleLabel = ROLE_LABELS[profile.role] ?? profile.role;

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
                          <option value="admin">대표</option>
                          <option value="manager">총괄 매니저</option>
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
