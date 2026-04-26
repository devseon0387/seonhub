import type { Roadmap } from '@/roadmap/types';

export const MARKETING_ROADMAP: Roadmap = {
  project: '도깨비스쿼드 콘텐츠 기획 & 마케팅',
  version: 1,
  updated: '2026-04-21',
  vision:
    '도깨비스쿼드 IP 전담 콘텐츠 기획·마케팅 에이전트. K-컬처 르네상스 세계관 + 5인 도깨비(용용이/보보/지지/힐힐/친친) 캐릭터 관리. YouTube Shorts·SNS·웹툰 에피소드 기획 + 콘텐츠 캘린더 운영.',
  currentPhaseId: 'p2-webtoon',
  phases: [
    {
      id: 'p1-world-setup',
      title: '세계관 + 캐릭터 5인 정립',
      status: 'done',
      summary: '2025 차원 균열 설정, 계약 시스템, MBTI×역할 기반 5인 도깨비 프로필, SNS 플랫폼 매핑.',
      goal: '세계관과 캐릭터로 파생 콘텐츠 무한 생산 가능한 기반.',
      items: [
        { title: 'K-컬처 르네상스 세계관 + 차원 균열 + 계약 시스템', status: 'done' },
        { title: '5인 도깨비 프로필 (외형·MBTI·나이·능력·계약자·플랫폼)', status: 'done' },
        { title: '캐릭터별 말투/명대사 템플릿', status: 'done' },
        { title: '부적 디자인 + 도깨비불 색상 시스템', status: 'done' },
      ],
    },
    {
      id: 'p2-webtoon',
      title: '웹툰 시즌 1 — 배진탁 × 소예린',
      status: 'in-progress',
      target: '2026-07-31',
      summary: '한음예고 배경 + 주인공 2인(ISFP·기축 vs ESTP·병인). "운명을 읽는 것과 운명을 바꾸는 것의 차이".',
      goal: '시즌 1 20화 기획서 + 시놉시스 완성.',
      items: [
        { title: '시즌 1 테마 확정 (운명 읽기 vs 바꾸기)', status: 'done' },
        { title: '주인공 2인 프로필 (사주+MBTI+성장 서사)', status: 'done' },
        { title: '1-5화 기획서', status: 'in-progress' as const },
        { title: '6-20화 기획서', status: 'todo' },
        { title: '캐릭터 대화 샘플 (말투 검증용)', status: 'todo' },
      ],
    },
    {
      id: 'p3-shorts-sns',
      title: 'YouTube Shorts + SNS 캘린더',
      status: 'planned',
      target: '2026-09-30',
      summary: '캐릭터별 플랫폼 분담 (용용이=Shorts/TikTok, 보보=Insta/Naver, 지지=Naver Blog/Insta, 힐힐=Insta/TikTok, 친친=Insta/TikTok). 월 캘린더 + 포스팅 템플릿.',
      goal: '정기 포스팅 파이프라인 가동.',
      items: [
        { title: '캐릭터별 월 콘텐츠 캘린더 템플릿', status: 'todo' },
        { title: 'Shorts 기획서 템플릿 (용용이/힐힐/친친)', status: 'todo' },
        { title: '인포그래픽 카드뉴스 템플릿 (보보/지지)', status: 'todo' },
      ],
    },
    {
      id: 'p4-merch',
      title: '굿즈 + 오프라인 접점',
      status: 'planned',
      target: '2026-12-31',
      summary: '부적 카드·스티커·텀블러 등. 카페/편집샵 팝업 기획.',
      goal: 'IP가 디지털→오프라인으로 확장.',
      items: [
        { title: '부적 카드 디자인 5종', status: 'todo' },
        { title: '팝업 스토어 기획서', status: 'todo' },
      ],
    },
  ],
  decisions: [
    {
      date: '2026-02-15',
      title: '5인 도깨비를 MBTI×플랫폼 매칭',
      why: '각 캐릭터의 SNS 활동이 MBTI 성향과 일관되면 팬 공감도 ↑. 용용이=ESTP=Shorts, 지지=INTP=블로그 등 자연스러움.',
      alt: '5인 모두 모든 플랫폼 운영 — 기각. 캐릭터 정체성 흐려짐.',
    },
  ],
  openQuestions: [
    '웹툰 플랫폼 선정 (네이버 vs 카카오 vs 자체)',
    '부적 디자인 NFT화 여부',
  ],
};
