'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
    } else {
      setIsSuccess(true);
      // 이메일 확인이 비활성화된 경우 바로 대시보드로 이동
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 & 제목 */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-purple-500 rounded-2xl shadow-lg mb-4">
            <UserPlus className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">VIDEO MOMENT</h1>
          <p className="text-gray-600">새로운 계정 만들기</p>
        </div>

        {/* 회원가입 폼 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 p-8">
          {isSuccess ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <CheckCircle size={56} className="text-green-500" />
              <h2 className="text-xl font-bold text-gray-900">계정이 생성되었습니다!</h2>
              <p className="text-gray-500 text-sm text-center">
                대시보드로 이동 중입니다...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    : 'bg-purple-500 hover:bg-purple-600 shadow-lg hover:shadow-xl'
                } text-white`}
              >
                {isLoading ? '가입 중...' : '회원가입'}
              </button>
            </form>
          )}

          {/* 비밀번호 조건 안내 */}
          {!isSuccess && (
            <div className="mt-6 p-4 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-700 font-medium mb-2">
                <CheckCircle size={14} className="inline mr-1" />
                비밀번호 조건
              </p>
              <ul className="text-xs text-purple-600 space-y-1 ml-5 list-disc">
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
                <Link href="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
                  로그인하기
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © 2024 VIDEO MOMENT. All rights reserved.
        </p>
      </div>
    </div>
  );
}
