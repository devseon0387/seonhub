'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Palette, ClipboardList } from 'lucide-react';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';

export default function SettingsPage() {
  const [name, setName] = useState('관리자');
  const [email, setEmail] = useState('admin@videomoment.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">설정</h1>
        <p className="text-gray-500 mt-2">시스템 설정 및 계정 관리</p>
      </div>

      {/* 설정 섹션 */}
      <div className="space-y-6">
        {/* 디자인 시스템 */}
        <Link href="/settings/design/components">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200/50 rounded-xl shadow-md p-6 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Palette className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">디자인 시스템</h2>
            </div>
            <p className="text-gray-600">컴포넌트, 토스트, 모달 등 디자인 요소 보기</p>
          </div>
        </Link>
        {/* 업데이트 기록 */}
        <Link href="/settings/changelog">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200/50 rounded-xl shadow-md p-6 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500 rounded-lg">
                <ClipboardList className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">업데이트 기록</h2>
            </div>
            <p className="text-gray-600">기능 추가, 수정 사항 등 변경 이력 확인</p>
          </div>
        </Link>

        {/* 계정 정보 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">계정 정보</h2>
          <div className="space-y-4">
            <FloatingLabelInput
              label="이름"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <FloatingLabelInput
              label="이메일"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div>
              <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                저장
              </button>
            </div>
          </div>
        </div>

        {/* 비밀번호 변경 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">비밀번호 변경</h2>
          <div className="space-y-4">
            <FloatingLabelInput
              label="현재 비밀번호"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <FloatingLabelInput
              label="새 비밀번호"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <FloatingLabelInput
              label="새 비밀번호 확인"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div>
              <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                비밀번호 변경
              </button>
            </div>
          </div>
        </div>

        {/* 알림 설정 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">알림 설정</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">새 프로젝트 알림</p>
                <p className="text-sm text-gray-500">새로운 프로젝트가 생성되면 알림을 받습니다</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">파트너 가입 알림</p>
                <p className="text-sm text-gray-500">새로운 파트너가 가입하면 알림을 받습니다</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">프로젝트 완료 알림</p>
                <p className="text-sm text-gray-500">프로젝트가 완료되면 알림을 받습니다</p>
              </div>
              <input type="checkbox" className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
