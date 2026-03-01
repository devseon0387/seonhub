'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const toast = useToast();
  const [email,      setEmail     ] = useState('');
  const [password,   setPassword  ] = useState('');
  const [showPw,     setShowPw    ] = useState(false);
  const [error,      setError     ] = useState('');
  const [isLoading,  setIsLoading ] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [mounted,    setMounted   ] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [pwFocus,    setPwFocus   ] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('vm_stay_logged_in');
    setRememberMe(saved !== '0');
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        toast.error('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
        setIsLoading(false);
      } else {
        // 관리자 승인 여부 확인
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('approved, role, needs_password_change')
          .eq('email', email)
          .single();

        if (profile && profile.role !== 'admin' && profile.approved !== true) {
          await supabase.auth.signOut();
          setError('관리자 승인 대기 중입니다. 승인 후 로그인할 수 있습니다.');
          toast.error('관리자 승인 대기 중입니다.');
          setIsLoading(false);
          return;
        }

        if (rememberMe) localStorage.setItem('vm_stay_logged_in', '1');
        else localStorage.removeItem('vm_stay_logged_in');
        sessionStorage.setItem('vm_active_session', '1');
        sessionStorage.setItem('vm_just_logged_in', '1');

        // 비밀번호 변경 필요 여부 확인
        if (profile && profile.needs_password_change === true) {
          window.location.href = '/change-password';
        } else {
          window.location.href = '/management';
        }
      }
    } catch (err) {
      setError(String(err));
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .vm-login-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #f5f4f2;
        }
        .vm-login-root * { cursor: default !important; }
        .vm-login-root input { cursor: text !important; }
        .vm-login-root button, .vm-login-root a, .vm-login-root label { cursor: pointer !important; }

        @keyframes cardUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes logoIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* card */
        .vm-card {
          width: 100%;
          max-width: 400px;
          background: #ffffff;
          border: 1px solid #ede9e6;
          border-radius: 16px;
          padding: 40px;
          box-shadow:
            0 1px 3px rgba(0,0,0,0.04),
            0 4px 16px rgba(0,0,0,0.03);
        }

        /* floating label input */
        .vm-field {
          position: relative;
          margin-bottom: 16px;
        }
        .vm-field-input {
          width: 100%;
          padding: 20px 16px 8px;
          background: #fafaf9;
          border: 1.5px solid #e8e3de;
          border-radius: 12px;
          font-size: 15px;
          color: #1c1917;
          font-family: inherit;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .vm-field-input:focus {
          background: #ffffff;
          border-color: #ea580c;
          box-shadow: 0 0 0 3px rgba(234,88,12,0.08);
        }
        .vm-field-label {
          position: absolute;
          left: 16px; top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          color: #a8a29e;
          pointer-events: none;
          transition: all 0.2s ease;
        }
        .vm-field-label.active {
          top: 13px; transform: translateY(0);
          font-size: 10.5px; font-weight: 600;
          color: #ea580c; letter-spacing: 0.04em;
        }
        .vm-field-label.filled {
          top: 13px; transform: translateY(0);
          font-size: 10.5px; font-weight: 600;
          color: #a8a29e; letter-spacing: 0.04em;
        }

        /* submit */
        .vm-submit {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          color: #fff;
          background: #1c1917;
          transition: all 0.2s ease;
        }
        .vm-submit:hover:not(:disabled) {
          background: #292524;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }
        .vm-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        .vm-submit:disabled {
          background: #d6d3d1;
          color: #a8a29e;
        }

        /* spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .vm-spinner {
          display: inline-block;
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        /* checkbox */
        .vm-check {
          width: 18px; height: 18px;
          border-radius: 5px;
          flex-shrink: 0;
          display: flex;
          align-items: center; justify-content: center;
          transition: all 0.2s ease;
        }
        .vm-check.on { background: #1c1917; }
        .vm-check.off { background: transparent; border: 1.5px solid #d6cec8; }

        /* error */
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(2px); }
        }
        .vm-error {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          background: rgba(239,68,68,0.05);
          border: 1px solid rgba(239,68,68,0.12);
          font-size: 13px;
          color: #dc2626;
          animation: shake 0.4s ease;
        }

        .vm-pw-toggle {
          position: absolute;
          right: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          padding: 4px;
          color: #c4b5a5;
          display: flex; align-items: center;
          transition: color 0.15s;
        }
        .vm-pw-toggle:hover { color: #78716c; }

        .vm-divider {
          height: 1px;
          margin: 24px 0;
          background: #f0ece9;
        }

      `}</style>

      <div className="vm-login-root">
        {/* 로고 + 타이틀 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'none' : 'scale(0.9)',
          transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <img
            src="/logo.png"
            alt="비모 ERP"
            style={{
              width: '110px', height: 'auto',
              display: 'block',
              margin: '0 auto 16px',
              animation: mounted ? 'logoIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both' : 'none',
            }}
          />
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#ea580c', background: '#fff7ed', border: '1px solid #fed7aa', padding: '2px 10px', borderRadius: '6px', letterSpacing: '0.05em' }}>VIMO ERP</span>
          </p>
        </div>

        {/* 카드 */}
        <div className="vm-card" style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s',
        }}>
          <form onSubmit={handleSubmit}>
            {/* 이메일 */}
            <div className="vm-field">
              <input
                className="vm-field-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocus(true)}
                onBlur={() => setEmailFocus(false)}
                required
                autoComplete="email"
              />
              <span className={`vm-field-label ${emailFocus ? 'active' : email ? 'filled' : ''}`}>
                이메일 주소
              </span>
            </div>

            {/* 비밀번호 */}
            <div className="vm-field" style={{ marginBottom: '20px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  className="vm-field-input"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPwFocus(true)}
                  onBlur={() => setPwFocus(false)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '46px' }}
                />
                <span className={`vm-field-label ${pwFocus ? 'active' : password ? 'filled' : ''}`}>
                  비밀번호
                </span>
                <button type="button" className="vm-pw-toggle" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* 로그인 유지 */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: '24px', userSelect: 'none',
            }}>
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ display: 'none' }} />
              <div className={`vm-check ${rememberMe ? 'on' : 'off'}`}>
                {rememberMe && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: '13px', color: '#78716c', fontWeight: 500 }}>로그인 유지</span>
            </label>

            {/* 에러 */}
            {error && (
              <div className="vm-error">
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{error}</span>
              </div>
            )}

            {/* 버튼 */}
            <button type="submit" disabled={isLoading} className="vm-submit">
              {isLoading ? <span className="vm-spinner" /> : '로그인'}
            </button>
          </form>

          <div className="vm-divider" />

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#a8a29e' }}>
            계정이 필요하시면 관리자에게 문의하세요.
          </p>
        </div>

        {/* 푸터 */}
        <p style={{
          marginTop: '28px',
          fontSize: '11px',
          color: '#d6cec8',
          letterSpacing: '0.04em',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.5s ease 0.4s',
        }}>
          &copy; 2026 VIMO ERP · v0.1.2 · 2026.02.24
        </p>
      </div>
    </>
  );
}
