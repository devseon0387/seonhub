'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    if (!email.includes('@')) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name.trim(),
          phone: phone.trim(),
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
    } else {
      // signUp 후 user 객체 확인
      const userId = authData.user?.id ?? authData.session?.user?.id;

      if (!userId) {
        setError('계정은 생성되었으나 프로필 등록에 실패했습니다. 관리자에게 문의하세요. (user ID 없음)');
        setIsLoading(false);
        return;
      }

      // 서버 API로 user_profiles 생성 (RLS 우회)
      const profileRes = await fetch('/api/auth/signup-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: name.trim(),
          email,
        }),
      });

      if (!profileRes.ok) {
        const errData = await profileRes.json().catch(() => ({ error: '알 수 없는 오류' }));
        setError(`프로필 등록 실패: ${errData.error}`);
        setIsLoading(false);
        return;
      }

      // 로그인 세션 해제 (승인 전까지 접근 불가)
      await supabase.auth.signOut();
      setIsSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 & 제목 */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-orange-500 rounded-2xl shadow-lg mb-4">
            <UserPlus className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">VIMO ERP</h1>
          <p className="text-gray-600">새로운 계정 만들기</p>
        </div>

        {/* 회원가입 폼 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 p-8">
          {isSuccess ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <CheckCircle size={56} className="text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900">가입 신청이 완료되었습니다!</h2>
              <p className="text-gray-500 text-sm text-center leading-relaxed">
                관리자의 승인 후 로그인할 수 있습니다.<br />
                승인이 완료되면 로그인해주세요.
              </p>
              <Link
                href="/login"
                className="mt-2 px-6 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors"
              >
                로그인 페이지로 이동
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <FloatingLabelInput
                label="이름"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />

              <FloatingLabelInput
                label="연락처"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />

              <FloatingLabelInput
                label="이메일"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <FloatingLabelInput
                label="비밀번호"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <FloatingLabelInput
                label="비밀번호 확인"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl'
                } text-white`}
              >
                {isLoading ? '가입 중...' : '회원가입'}
              </button>
            </form>
          )}

          {/* 비밀번호 조건 안내 */}
          {!isSuccess && (
            <div className="mt-6 p-4 bg-orange-50 rounded-lg">
              <p className="text-xs text-orange-700 font-medium mb-2">
                <CheckCircle size={14} className="inline mr-1" />
                비밀번호 조건
              </p>
              <ul className="text-xs text-orange-600 space-y-1 ml-5 list-disc">
                <li>최소 6자 이상</li>
                <li>비밀번호 확인과 일치해야 합니다</li>
              </ul>
            </div>
          )}

          {/* 로그인 링크 */}
          {!isSuccess && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                이미 계정이 있으신가요?{' '}
                <Link href="/login" className="text-orange-600 hover:text-orange-700 font-semibold">
                  로그인하기
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © 2026 VIMO ERP. All rights reserved.
        </p>
      </div>
    </div>
  );
}
