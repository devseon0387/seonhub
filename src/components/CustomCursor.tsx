'use client';

import { useEffect, useRef } from 'react';

const LERP_RING   = 0.1;
const LERP_DOT    = 0.1;   // 점 크기 보간 속도
const DOT_DEFAULT = 13;
const DOT_HOVER   = 32;
const RING_SIZE   = 50;

export default function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = -100, mouseY = -100;
    let ringX  = -100, ringY  = -100;
    let rafId: number;
    let hovering = false;
    let pressing = false;

    // 점 크기를 RAF로 보간 — CSS transition 불필요
    let dotCurrent = DOT_DEFAULT;
    let dotTarget  = DOT_DEFAULT;

    const setDot = (size: number) => {
      dot.style.width      = `${size}px`;
      dot.style.height     = `${size}px`;
      dot.style.marginLeft = `-${size / 2}px`;
      dot.style.marginTop  = `-${size / 2}px`;
    };

    const applyDefault = () => {
      dotTarget = DOT_DEFAULT;
      ring.style.opacity = '0.45';
    };
    const applyHover = () => {
      dotTarget = DOT_HOVER;
      ring.style.opacity = '0';
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    };

    const onMouseOver = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a,button,input,textarea,select,[role="button"]')) {
        if (!hovering) { hovering = true; applyHover(); }
      }
    };
    const onMouseOut = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a,button,input,textarea,select,[role="button"]')) {
        if (hovering) { hovering = false; applyDefault(); }
      }
    };

    const onMouseDown = () => {
      pressing = true;
      // 점이 링 안쪽까지 꽉 차도록 성장
      dotTarget = RING_SIZE - 4;
      // 링도 살짝 진하게
      ring.style.opacity = hovering ? '0.5' : '0.6';
    };

    const onMouseUp = () => {
      pressing = false;
      hovering ? applyHover() : applyDefault();
    };

    const onDocLeave = () => { dot.style.opacity = '0'; ring.style.opacity = '0'; };
    const onDocEnter = () => { dot.style.opacity = '1'; if (!hovering) ring.style.opacity = '0.45'; };

    // 단일 RAF 루프 — 점 크기 + 링 위치 함께 처리
    const loop = () => {
      // 점 크기 lerp
      dotCurrent += (dotTarget - dotCurrent) * LERP_DOT;
      setDot(dotCurrent);

      // 링 위치 lerp
      ringX += (mouseX - ringX) * LERP_RING;
      ringY += (mouseY - ringY) * LERP_RING;
      ring.style.transform = `translate(${ringX}px, ${ringY}px)`;

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseover', onMouseOver, { passive: true });
    window.addEventListener('mouseout',  onMouseOut,  { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mouseup',   onMouseUp,   { passive: true });
    document.addEventListener('mouseleave', onDocLeave,  { passive: true });
    document.addEventListener('mouseenter', onDocEnter,  { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('mouseout',  onMouseOut);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup',   onMouseUp);
      document.removeEventListener('mouseleave', onDocLeave);
      document.removeEventListener('mouseenter', onDocEnter);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        style={{
          position:        'fixed',
          top:             0,
          left:            0,
          width:           DOT_DEFAULT,
          height:          DOT_DEFAULT,
          marginLeft:      -(DOT_DEFAULT / 2),
          marginTop:       -(DOT_DEFAULT / 2),
          backgroundColor: 'rgb(59,130,246)',
          borderRadius:    '50%',
          pointerEvents:   'none',
          zIndex:          99999,
          // 크기는 RAF가 처리 — opacity만 transition
          transition:      'opacity 0.3s ease',
        }}
      />
      <div
        ref={ringRef}
        style={{
          position:      'fixed',
          top:           0,
          left:          0,
          width:         RING_SIZE,
          height:        RING_SIZE,
          marginLeft:    -(RING_SIZE / 2),
          marginTop:     -(RING_SIZE / 2),
          borderRadius:  '50%',
          border:        '2px solid rgba(96,165,250,0.85)',
          pointerEvents: 'none',
          zIndex:        99998,
          opacity:       0.75,
          transition:    'opacity 0.2s ease',
        }}
      />
    </>
  );
}
