import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f4f2',
      fontFamily: 'sans-serif',
    }}>
      <h1 style={{ fontSize: '72px', fontWeight: 800, color: '#ea580c', margin: 0 }}>404</h1>
      <p style={{ fontSize: '18px', color: '#78716c', marginTop: '8px' }}>페이지를 찾을 수 없습니다</p>
      <Link
        href="/management"
        style={{
          marginTop: '24px',
          padding: '10px 24px',
          background: '#ea580c',
          color: '#fff',
          borderRadius: '12px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        홈으로 돌아가기
      </Link>
      <p style={{ marginTop: '32px', fontSize: '11px', color: '#d6cec8', letterSpacing: '0.1em' }}>VIMO ERP</p>
    </div>
  );
}
