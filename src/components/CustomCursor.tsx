'use client';

import { useEffect, useRef } from 'react';

const LERP_RING  = 0.1;
const LERP_DOT   = 0.1;
const DOT_DEFAULT = 13;
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
      dot.style.opacity      = '1';
      dot.style.background   = 'rgb(234,88,12)';
      // 링 — 원래 스타일
      ring.style.opacity     = '0.45';
      ring.style.width       = `${RING_SIZE}px`;
      ring.style.height      = `${RING_SIZE}px`;
      ring.style.marginLeft  = `-${RING_SIZE / 2}px`;
      ring.style.marginTop   = `-${RING_SIZE / 2}px`;
      ring.style.background  = 'transparent';
      ring.style.border      = '2px solid rgba(234,88,12,0.7)';
    };

    const applyHover = () => {
      // 점 사라짐
      dot.style.opacity = '0';
      // 링 — 수정 후 스타일 (버블처럼 줄어들며 채워짐)
      const s = 30;
      ring.style.opacity     = '1';
      ring.style.width       = `${s}px`;
      ring.style.height      = `${s}px`;
      ring.style.marginLeft  = `-${s / 2}px`;
      ring.style.marginTop   = `-${s / 2}px`;
      ring.style.background  = 'rgba(234,88,12,0.13)';
      ring.style.border      = '1.5px solid rgba(234,88,12,0.75)';
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
      if (hovering) {
        ring.style.background = 'rgba(234,88,12,0.22)';
        ring.style.border     = '1.5px solid rgba(234,88,12,1)';
      } else {
        dotTarget = RING_SIZE - 4;
        ring.style.opacity = '0.6';
      }
    };
    const onMouseUp = () => {
      hovering ? applyHover() : applyDefault();
    };

    const onDocLeave = () => { dot.style.opacity = '0'; ring.style.opacity = '0'; };
    const onDocEnter = () => { if (!hovering) { dot.style.opacity = '1'; ring.style.opacity = '0.45'; } };

    const loop = () => {
      dotCurrent += (dotTarget - dotCurrent) * LERP_DOT;
      setDot(dotCurrent);

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
    document.addEventListener('mouseleave', onDocLeave, { passive: true });
    document.addEventListener('mouseenter', onDocEnter, { passive: true });

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
          position:      'fixed',
          top:           0,
          left:          0,
          width:         DOT_DEFAULT,
          height:        DOT_DEFAULT,
          marginLeft:    -(DOT_DEFAULT / 2),
          marginTop:     -(DOT_DEFAULT / 2),
          background:    'rgb(234,88,12)',
          borderRadius:  '50%',
          pointerEvents: 'none',
          zIndex:        99999,
          transition:    'opacity 0.15s ease',
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
          border:        '2px solid rgba(234,88,12,0.7)',
          background:    'transparent',
          pointerEvents: 'none',
          zIndex:        99998,
          opacity:       0.45,
          transition:    'width 0.2s ease, height 0.2s ease, margin 0.2s ease, background 0.2s ease, border 0.2s ease, opacity 0.2s ease',
        }}
      />
    </>
  );
}
