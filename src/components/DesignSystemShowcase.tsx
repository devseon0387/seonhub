'use client';

import { useState } from 'react';
import {
  Palette, Type as TypeIcon, Square, MousePointerClick, TextCursorInput,
  AlignLeft, ChevronDown as ChevronDownIcon, CheckSquare, LayoutGrid,
  Layers, Tag, Heading, Inbox, Search, Plus, Trash2, ArrowRight,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import SectionHeader from '@/components/ui/SectionHeader';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import Tabs from '@/components/ui/Tabs';

type Section = { id: string; label: string; icon: React.ElementType };

const SECTIONS: Section[] = [
  { id: 'colors',        label: '색상',          icon: Palette          },
  { id: 'typography',    label: '타이포그래피',   icon: TypeIcon         },
  { id: 'radius',        label: '라디우스',      icon: Square           },
  { id: 'button',        label: 'Button',       icon: MousePointerClick },
  { id: 'input',         label: 'Input',        icon: TextCursorInput  },
  { id: 'textarea',      label: 'Textarea',     icon: AlignLeft        },
  { id: 'select',        label: 'Select',       icon: ChevronDownIcon  },
  { id: 'checkbox',      label: 'Checkbox',     icon: CheckSquare      },
  { id: 'tabs',          label: 'Tabs',         icon: LayoutGrid       },
  { id: 'card',          label: 'Card',         icon: Layers           },
  { id: 'chip',          label: 'Chip',         icon: Tag              },
  { id: 'sectionHeader', label: 'SectionHeader', icon: Heading         },
  { id: 'emptyState',    label: 'EmptyState',   icon: Inbox            },
];

const INK_SCALE = [50, 100, 200, 300, 400, 500, 600, 700, 900];
const BRAND_SCALE = [50, 100, 200, 400, 500, 600, 700];
const OK_SCALE = [50, 500, 600, 700];
const WARN_SCALE = [50, 500, 600, 700];
const BAD_SCALE = [50, 100, 500, 600, 700];

function Swatch({ token, bg }: { token: string; bg: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className={`h-14 w-full rounded-lg border border-ink-200 ${bg}`} style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.02)' }} />
      <div className="text-meta font-mono">{token}</div>
    </div>
  );
}

function Block({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-ink-200">
        <Icon size={16} className="text-ink-500" />
        <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemShowcase({ showHeader = true }: { showHeader?: boolean }) {
  const [tab, setTab] = useState('overview');
  const [checked, setChecked] = useState(true);
  const [unchecked, setUnchecked] = useState(false);

  return (
    <div className="flex gap-8">
      <aside className="hidden lg:block shrink-0 w-48 sticky top-4 self-start">
        <div className="text-kicker mb-3">디자인 시스템</div>
        <nav className="space-y-0.5">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-ink-600 hover:bg-ink-100 hover:text-ink-900 transition-colors">
              <s.icon size={12} className="text-ink-400" />
              <span>{s.label}</span>
            </a>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 space-y-10 pb-20">
        {showHeader && (
          <header>
            <div className="text-kicker mb-2">Design System</div>
            <h1 className="text-page">SEON Hub 디자인 시스템</h1>
            <p className="text-body text-ink-500 mt-2">토큰·primitive 단일 소스. 새 UI는 여기 컴포넌트 조합만 사용. 하드코딩 금지.</p>
          </header>
        )}

        <Block id="colors" icon={Palette} title="색상">
          <div className="space-y-5">
            <div>
              <div className="text-kicker mb-2">ink (warm gray)</div>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                {INK_SCALE.map((n) => <Swatch key={n} token={`ink-${n}`} bg={`bg-ink-${n}`} />)}
              </div>
            </div>
            <div>
              <div className="text-kicker mb-2">brand (SEON navy)</div>
              <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                {BRAND_SCALE.map((n) => <Swatch key={n} token={`brand-${n}`} bg={`bg-brand-${n}`} />)}
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              <div>
                <div className="text-kicker mb-2">ok</div>
                <div className="grid grid-cols-4 gap-2">
                  {OK_SCALE.map((n) => <Swatch key={n} token={`ok-${n}`} bg={`bg-ok-${n}`} />)}
                </div>
              </div>
              <div>
                <div className="text-kicker mb-2">warn</div>
                <div className="grid grid-cols-4 gap-2">
                  {WARN_SCALE.map((n) => <Swatch key={n} token={`warn-${n}`} bg={`bg-warn-${n}`} />)}
                </div>
              </div>
              <div>
                <div className="text-kicker mb-2">bad</div>
                <div className="grid grid-cols-5 gap-2">
                  {BAD_SCALE.map((n) => <Swatch key={n} token={`bad-${n}`} bg={`bg-bad-${n}`} />)}
                </div>
              </div>
            </div>
          </div>
        </Block>

        <Block id="typography" icon={TypeIcon} title="타이포그래피">
          <Card padded="lg" className="space-y-3">
            <div><span className="text-kicker w-28 inline-block">text-page</span><span className="text-page">페이지 제목 20px</span></div>
            <div><span className="text-kicker w-28 inline-block">text-section</span><span className="text-section">섹션 제목 13px bold</span></div>
            <div><span className="text-kicker w-28 inline-block">text-body</span><span className="text-body">본문 13px</span></div>
            <div><span className="text-kicker w-28 inline-block">text-caption</span><span className="text-caption">보조 설명 11px</span></div>
            <div><span className="text-kicker w-28 inline-block">text-meta</span><span className="text-meta">메타데이터 10px</span></div>
            <div><span className="text-kicker w-28 inline-block">text-kicker</span><span className="text-kicker">KICKER 11PX</span></div>
          </Card>
        </Block>

        <Block id="radius" icon={Square} title="라디우스 / 카드">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { cls: 'rounded-md', label: 'md (6px)' },
              { cls: 'rounded-lg', label: 'lg (8px)' },
              { cls: 'rounded-xl', label: 'xl (12px) · Card 기본' },
              { cls: 'rounded-2xl', label: '2xl (16px)' },
            ].map((r) => (
              <div key={r.cls} className={`h-20 bg-white border border-ink-200 ${r.cls} flex items-center justify-center text-meta`}>{r.label}</div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <Card variant="surface" radius="lg" padded="md"><div className="text-body">surface / lg</div></Card>
            <Card variant="subtle" radius="lg" padded="md"><div className="text-body">subtle / lg</div></Card>
            <Card variant="flat" radius="lg" padded="md"><div className="text-body">flat / lg</div></Card>
          </div>
        </Block>

        <Block id="button" icon={MousePointerClick} title="Button">
          <Card padded="lg" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button iconLeft={<Plus size={14} />}>추가</Button>
              <Button variant="secondary" iconRight={<ArrowRight size={14} />}>다음</Button>
              <Button variant="destructive" iconLeft={<Trash2 size={14} />}>삭제</Button>
              <Button loading>로딩</Button>
              <Button disabled>비활성</Button>
            </div>
          </Card>
        </Block>

        <Block id="input" icon={TextCursorInput} title="Input">
          <Card padded="lg" className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-caption text-ink-600">기본</label>
              <Input placeholder="검색..." />
            </div>
            <div className="space-y-2">
              <label className="text-caption text-ink-600">Invalid</label>
              <Input invalid defaultValue="잘못된 값" />
            </div>
            <div className="space-y-2">
              <label className="text-caption text-ink-600">비활성</label>
              <Input disabled defaultValue="disabled" />
            </div>
            <div className="space-y-2">
              <label className="text-caption text-ink-600">Size 변형</label>
              <div className="flex gap-2">
                <Input inputSize="sm" placeholder="sm" />
                <Input inputSize="md" placeholder="md" />
                <Input inputSize="lg" placeholder="lg" />
              </div>
            </div>
          </Card>
        </Block>

        <Block id="textarea" icon={AlignLeft} title="Textarea">
          <Card padded="lg" className="grid md:grid-cols-2 gap-4">
            <Textarea placeholder="내용을 입력하세요" />
            <Textarea invalid defaultValue="에러 상태" />
          </Card>
        </Block>

        <Block id="select" icon={ChevronDownIcon} title="Select">
          <Card padded="lg" className="grid md:grid-cols-3 gap-4">
            <Select options={[
              { value: 'draft', label: '초안' },
              { value: 'active', label: '진행 중' },
              { value: 'done', label: '완료' },
            ]} defaultValue="active" />
            <Select placeholder="선택해주세요" options={[
              { value: 'a', label: '옵션 A' },
              { value: 'b', label: '옵션 B' },
              { value: 'c', label: '옵션 C', disabled: true },
            ]} defaultValue="" />
            <Select invalid options={[{ value: 'x', label: '에러 상태' }]} defaultValue="x" />
          </Card>
        </Block>

        <Block id="checkbox" icon={CheckSquare} title="Checkbox">
          <Card padded="lg" className="space-y-3">
            <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} label="이용약관에 동의합니다" description="개인정보 수집·이용 동의 포함" />
            <Checkbox checked={unchecked} onChange={(e) => setUnchecked(e.target.checked)} label="마케팅 정보 수신 (선택)" />
            <Checkbox label="비활성 상태" disabled />
          </Card>
        </Block>

        <Block id="tabs" icon={LayoutGrid} title="Tabs">
          <Card padded="lg" className="space-y-4">
            <Tabs value={tab} onChange={setTab} items={[
              { value: 'overview', label: '개요' },
              { value: 'detail', label: '상세', count: 12 },
              { value: 'history', label: '이력' },
              { value: 'locked', label: '비활성', disabled: true },
            ]} />
            <div className="text-body text-ink-500">선택된 탭: <span className="text-ink-900 font-medium">{tab}</span></div>
          </Card>
        </Block>

        <Block id="card" icon={Layers} title="Card">
          <div className="grid md:grid-cols-3 gap-3">
            <Card padded="md">
              <div className="text-section mb-1">기본 카드</div>
              <div className="text-body text-ink-500">variant=&quot;surface&quot; · radius=&quot;lg&quot;</div>
            </Card>
            <Card variant="subtle" padded="md">
              <div className="text-section mb-1">Subtle</div>
              <div className="text-body text-ink-500">연한 배경, 보조 카드</div>
            </Card>
            <Card variant="flat" padded="md">
              <div className="text-section mb-1">Flat</div>
              <div className="text-body text-ink-500">테두리 없음, 그룹 배경</div>
            </Card>
          </div>
        </Block>

        <Block id="chip" icon={Tag} title="Chip">
          <Card padded="lg" className="flex flex-wrap gap-2">
            <Chip tone="neutral">기본</Chip>
            <Chip tone="brand">브랜드</Chip>
            <Chip tone="ok">성공</Chip>
            <Chip tone="warn">경고</Chip>
            <Chip tone="bad">에러</Chip>
            <Chip tone="info">정보</Chip>
            <Chip size="xs" tone="neutral">xs 크기</Chip>
          </Card>
        </Block>

        <Block id="sectionHeader" icon={Heading} title="SectionHeader">
          <Card padded="lg" className="space-y-4">
            <SectionHeader title="프로젝트 목록" count={24} />
            <SectionHeader title="최근 활동" kicker="RECENT" icon={<Search size={14} />} right={<Button size="sm" variant="ghost">더보기</Button>} />
            <SectionHeader title="카테고리" variant="kicker" />
          </Card>
        </Block>

        <Block id="emptyState" icon={Inbox} title="EmptyState">
          <div className="grid md:grid-cols-3 gap-3">
            <Card padded="md">
              <EmptyState size="sm" icon={<Inbox size={28} />} label="내용이 없어요" description="새 항목을 추가해보세요" />
            </Card>
            <Card padded="md">
              <EmptyState size="md" icon={<Search size={32} />} label="검색 결과 없음" description="다른 키워드로 시도해보세요" />
            </Card>
            <Card padded="md">
              <EmptyState size="lg" icon={<Inbox size={36} />} label="비어 있음" />
            </Card>
          </div>
        </Block>
      </div>
    </div>
  );
}
