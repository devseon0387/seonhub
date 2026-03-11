'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, Send, AlertCircle, CheckCircle2, Plus, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import RichTextEditor from './_components/RichTextEditor';

export default function ComposeMailPage() {
  const toast = useToast();

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [to, setTo] = useState<string[]>([]);
  const [toInput, setToInput] = useState('');
  const [cc, setCc] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [subject, setSubject] = useState('');
  const contentRef = useRef('');
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);

  const onContentChange = useCallback((html: string) => {
    contentRef.current = html;
  }, []);
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  useEffect(() => {
    fetch('/api/hiworks/send-mail')
      .then(res => res.json())
      .then(data => setConfigured(data.configured))
      .catch(() => setConfigured(false));
  }, []);

  const addEmail = useCallback((list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const email = input.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('올바른 이메일 형식이 아닙니다.');
      return;
    }
    if (list.includes(email)) {
      toast.error('이미 추가된 이메일입니다.');
      return;
    }
    setList([...list, email]);
    setInput('');
  }, [toast]);

  const removeEmail = useCallback((list: string[], setList: (v: string[]) => void, email: string) => {
    setList(list.filter(e => e !== email));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(list, setList, input, setInput);
    }
  }, [addEmail]);

  const handleSend = useCallback(async () => {
    if (to.length === 0) { toast.error('받는 사람을 입력해주세요.'); return; }
    if (!subject.trim()) { toast.error('제목을 입력해주세요.'); return; }
    const content = contentRef.current;
    if (!content.replace(/<[^>]*>/g, '').trim()) { toast.error('본문을 입력해주세요.'); return; }

    setSending(true);
    try {
      const res = await fetch('/api/hiworks/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          cc: cc.length > 0 ? cc : undefined,
          subject,
          content,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || '이메일 발송에 실패했습니다.');
        return;
      }

      toast.success('이메일이 발송되었습니다.');
      setTo([]);
      setCc([]);
      setSubject('');
      contentRef.current = '';
    } catch {
      toast.error('이메일 발송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  }, [to, cc, subject, toast]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }} className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">메일 쓰기</h1>
        <p className="text-gray-500 mt-2">하이웍스를 통해 이메일을 발송합니다.</p>
      </div>

      {/* API 상태 배너 */}
      {configured === false && (
        <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
          <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p style={{ fontWeight: 600, color: '#92400e', fontSize: '14px' }}>하이웍스 API 미연결</p>
            <p style={{ color: '#a16207', fontSize: '13px', marginTop: '4px' }}>
              환경변수(HIWORKS_OFFICE_TOKEN, HIWORKS_USER_ID)가 설정되지 않았습니다. 하이웍스 관리자 페이지에서 API 키를 발급받은 후 .env.local에 설정해주세요.
            </p>
          </div>
        </div>
      )}
      {configured === true && (
        <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
          <span style={{ color: '#166534', fontSize: '14px', fontWeight: 500 }}>하이웍스 API 연결됨</span>
        </div>
      )}

      {/* 이메일 작성 폼 */}
      <div className="bg-white rounded-lg shadow" style={{ border: '1px solid #ede9e6' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0ece9' }}>
          <div className="flex items-center gap-2">
            <Mail size={20} style={{ color: '#ea580c' }} />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1c1917' }}>이메일 작성</h2>
          </div>
        </div>

        <div style={{ padding: '24px' }} className="space-y-5">
          {/* 받는 사람 */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#44403c', marginBottom: '6px' }}>
              받는 사람 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px 12px', border: '1px solid #d6d3d1', borderRadius: '8px', minHeight: '42px', alignItems: 'center' }}>
              {to.map(email => (
                <span key={email} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: '#fef4ed', color: '#ea580c', borderRadius: '6px', fontSize: '13px' }}>
                  {email}
                  <button onClick={() => removeEmail(to, setTo, email)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: '#ea580c', display: 'flex' }}>
                    <X size={14} />
                  </button>
                </span>
              ))}
              <input
                type="email"
                value={toInput}
                onChange={e => setToInput(e.target.value)}
                onKeyDown={e => handleKeyDown(e, to, setTo, toInput, setToInput)}
                onBlur={() => { if (toInput.trim()) addEmail(to, setTo, toInput, setToInput); }}
                placeholder={to.length === 0 ? '이메일 주소 입력 후 Enter' : ''}
                style={{ border: 'none', outline: 'none', flex: 1, minWidth: '150px', fontSize: '14px', padding: '2px 0' }}
              />
            </div>
            {!showCc && (
              <button onClick={() => setShowCc(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#78716c', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={12} /> 참조 추가
              </button>
            )}
          </div>

          {/* 참조 */}
          {showCc && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#44403c', marginBottom: '6px' }}>
                참조 (CC)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px 12px', border: '1px solid #d6d3d1', borderRadius: '8px', minHeight: '42px', alignItems: 'center' }}>
                {cc.map(email => (
                  <span key={email} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: '#f5f3f1', color: '#44403c', borderRadius: '6px', fontSize: '13px' }}>
                    {email}
                    <button onClick={() => removeEmail(cc, setCc, email)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: '#78716c', display: 'flex' }}>
                      <X size={14} />
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  value={ccInput}
                  onChange={e => setCcInput(e.target.value)}
                  onKeyDown={e => handleKeyDown(e, cc, setCc, ccInput, setCcInput)}
                  onBlur={() => { if (ccInput.trim()) addEmail(cc, setCc, ccInput, setCcInput); }}
                  placeholder={cc.length === 0 ? '참조 이메일 입력 후 Enter' : ''}
                  style={{ border: 'none', outline: 'none', flex: 1, minWidth: '150px', fontSize: '14px', padding: '2px 0' }}
                />
              </div>
            </div>
          )}

          {/* 제목 */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#44403c', marginBottom: '6px' }}>
              제목 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="이메일 제목을 입력하세요"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d6d3d1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
            />
          </div>

          {/* 본문 */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#44403c', marginBottom: '6px' }}>
              본문 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <RichTextEditor onChangeRef={onContentChangeRef} />
          </div>
        </div>

        {/* 발송 버튼 */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0ece9', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSend}
            disabled={sending || configured === false}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: sending || configured === false ? 'not-allowed' : 'pointer',
              background: sending || configured === false ? '#d6d3d1' : '#ea580c',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'background 0.15s',
            }}
          >
            <Send size={16} />
            {sending ? '발송 중...' : '이메일 발송'}
          </button>
        </div>
      </div>
    </div>
  );
}
