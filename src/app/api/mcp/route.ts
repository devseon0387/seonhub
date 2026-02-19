import { NextRequest, NextResponse } from 'next/server';
import {
  dbGetGroups, dbGetGroup, dbCreateGroup,
  dbGetDocs, dbGetDoc, dbCreateDoc, dbUpdateDoc, dbDeleteDoc,
  StrategyBlock,
} from '../strategy/_lib';

// ─── helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);

function markdownToBlocks(text: string): StrategyBlock[] {
  const blocks: StrategyBlock[] = [];
  for (const line of text.split('\n')) {
    const t = line.trimEnd();
    if      (t.startsWith('### ')) blocks.push({ id: uid(), type: 'heading3', content: t.slice(4), checked: false });
    else if (t.startsWith('## '))  blocks.push({ id: uid(), type: 'heading2', content: t.slice(3), checked: false });
    else if (t.startsWith('# '))   blocks.push({ id: uid(), type: 'heading1', content: t.slice(2), checked: false });
    else if (t.startsWith('- '))   blocks.push({ id: uid(), type: 'bullet',   content: t.slice(2), checked: false });
    else if (/^\d+\.\s/.test(t))   blocks.push({ id: uid(), type: 'numbered', content: t.replace(/^\d+\.\s/, ''), checked: false });
    else if (t.startsWith('[x] ')) blocks.push({ id: uid(), type: 'todo',     content: t.slice(4), checked: true  });
    else if (t.startsWith('[ ] ') || t.startsWith('[] ')) blocks.push({ id: uid(), type: 'todo', content: t.replace(/^\[[ ]?\] /, ''), checked: false });
    else if (t === '---')          blocks.push({ id: uid(), type: 'divider',  content: '', checked: false });
    else if (t.startsWith('> '))   blocks.push({ id: uid(), type: 'callout',  content: t.slice(2), checked: false });
    else                           blocks.push({ id: uid(), type: 'paragraph', content: t, checked: false });
  }
  if (!blocks.length) blocks.push({ id: uid(), type: 'paragraph', content: '', checked: false });
  return blocks;
}

function blocksToMarkdown(blocks: StrategyBlock[]): string {
  return blocks.map(b => {
    switch (b.type) {
      case 'heading1': return `# ${b.content}`;
      case 'heading2': return `## ${b.content}`;
      case 'heading3': return `### ${b.content}`;
      case 'bullet':   return `- ${b.content}`;
      case 'numbered': return `1. ${b.content}`;
      case 'todo':     return `[${b.checked ? 'x' : ' '}] ${b.content}`;
      case 'divider':  return '---';
      case 'callout':  return `> ${b.content}`;
      default:         return b.content;
    }
  }).join('\n');
}

// ─── tool definitions ─────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'strategy_list_groups',
    description: '전략 그룹 목록을 조회합니다.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'strategy_list_pages',
    description: '특정 그룹의 페이지 목록을 조회합니다.',
    inputSchema: { type: 'object', properties: { groupId: { type: 'string', description: '그룹 ID' } }, required: ['groupId'] },
  },
  {
    name: 'strategy_read_page',
    description: '페이지의 전체 내용을 마크다운 형식으로 읽습니다.',
    inputSchema: { type: 'object', properties: { pageId: { type: 'string', description: '페이지 ID' } }, required: ['pageId'] },
  },
  {
    name: 'strategy_write_page',
    description: '페이지 내용을 마크다운으로 작성합니다. 기존 내용을 완전히 교체합니다.\n\n지원 문법:\n- `# 제목` → H1\n- `## 제목` → H2\n- `### 제목` → H3\n- `- 항목` → 글머리\n- `1. 항목` → 번호 목록\n- `[ ] 항목` → 할 일\n- `[x] 항목` → 완료된 할 일\n- `---` → 구분선\n- `> 텍스트` → 콜아웃\n- 일반 텍스트 → 단락',
    inputSchema: { type: 'object', properties: { pageId: { type: 'string', description: '페이지 ID' }, content: { type: 'string', description: '마크다운 형식의 내용' } }, required: ['pageId', 'content'] },
  },
  {
    name: 'strategy_append_to_page',
    description: '페이지 끝에 내용을 추가합니다. 기존 내용은 유지됩니다.',
    inputSchema: { type: 'object', properties: { pageId: { type: 'string', description: '페이지 ID' }, content: { type: 'string', description: '추가할 마크다운 내용' } }, required: ['pageId', 'content'] },
  },
  {
    name: 'strategy_create_page',
    description: '그룹 안에 새 페이지를 만들고 내용을 작성합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: { type: 'string', description: '그룹 ID' },
        title:   { type: 'string', description: '페이지 제목' },
        content: { type: 'string', description: '초기 내용 (마크다운, 선택사항)' },
        emoji:   { type: 'string', description: '이모지 (선택사항, 기본값: 📝)' },
      },
      required: ['groupId', 'title'],
    },
  },
  {
    name: 'strategy_create_group',
    description: '새 전략 그룹을 만듭니다.',
    inputSchema: {
      type: 'object',
      properties: {
        name:  { type: 'string', description: '그룹 이름' },
        emoji: { type: 'string', description: '이모지 (선택사항, 기본값: 📁)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'strategy_update_page_title',
    description: '페이지 제목과 이모지를 수정합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: '페이지 ID' },
        title:  { type: 'string', description: '새 제목 (선택사항)' },
        emoji:  { type: 'string', description: '새 이모지 (선택사항)' },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'strategy_delete_page',
    description: '페이지를 삭제합니다.',
    inputSchema: { type: 'object', properties: { pageId: { type: 'string', description: '페이지 ID' } }, required: ['pageId'] },
  },
];

// ─── tool handler ─────────────────────────────────────────────────────────────
type Args = Record<string, string>;

async function handleTool(name: string, args: Args) {
  switch (name) {
    case 'strategy_list_groups': {
      const groups = await dbGetGroups();
      if (!groups.length) return { content: [{ type: 'text', text: '아직 그룹이 없습니다.' }] };
      const lines = await Promise.all(groups.map(async g => {
        const docs = await dbGetDocs(g.id);
        return `${g.emoji} **${g.name}** (id: \`${g.id}\`, 페이지 ${docs.length}개)`;
      }));
      return { content: [{ type: 'text', text: `## 전략 그룹 목록\n\n${lines.join('\n')}` }] };
    }

    case 'strategy_list_pages': {
      const [group, docs] = await Promise.all([dbGetGroup(args.groupId), dbGetDocs(args.groupId)]);
      if (!group) return { content: [{ type: 'text', text: `그룹을 찾을 수 없습니다: ${args.groupId}` }] };
      if (!docs.length) return { content: [{ type: 'text', text: `${group.emoji} **${group.name}** — 아직 페이지가 없습니다.` }] };
      const lines = docs.map(d => `${d.emoji} **${d.title}** (id: \`${d.id}\`, 수정: ${new Date(d.updatedAt).toLocaleDateString('ko-KR')})`);
      return { content: [{ type: 'text', text: `## ${group.emoji} ${group.name}\n\n${lines.join('\n')}` }] };
    }

    case 'strategy_read_page': {
      const [doc, groups] = await Promise.all([dbGetDoc(args.pageId), dbGetGroups()]);
      if (!doc) return { content: [{ type: 'text', text: `페이지를 찾을 수 없습니다: ${args.pageId}` }] };
      const group = groups.find(g => g.id === doc.groupId);
      const header = [
        `# ${doc.emoji} ${doc.title}`,
        `> 그룹: ${group ? `${group.emoji} ${group.name}` : doc.groupId}`,
        `> 마지막 수정: ${new Date(doc.updatedAt).toLocaleString('ko-KR')}`,
        '', '---', '',
      ].join('\n');
      return { content: [{ type: 'text', text: header + blocksToMarkdown(doc.blocks) }] };
    }

    case 'strategy_write_page': {
      const doc = await dbUpdateDoc(args.pageId, { blocks: markdownToBlocks(args.content) });
      return { content: [{ type: 'text', text: `✅ **${doc.title}** 페이지가 업데이트되었습니다.` }] };
    }

    case 'strategy_append_to_page': {
      const doc = await dbGetDoc(args.pageId);
      if (!doc) return { content: [{ type: 'text', text: `페이지를 찾을 수 없습니다: ${args.pageId}` }] };
      const existing = doc.blocks.filter((b, i) =>
        !(i === doc.blocks.length - 1 && b.type === 'paragraph' && !b.content)
      );
      const updated = await dbUpdateDoc(args.pageId, { blocks: [...existing, ...markdownToBlocks(args.content)] });
      return { content: [{ type: 'text', text: `✅ **${updated.title}** 페이지에 내용이 추가되었습니다.` }] };
    }

    case 'strategy_create_page': {
      const group = await dbGetGroup(args.groupId);
      if (!group) return { content: [{ type: 'text', text: `그룹을 찾을 수 없습니다: ${args.groupId}` }] };
      const doc = await dbCreateDoc({
        id: uid(),
        groupId: args.groupId,
        title: args.title,
        emoji: args.emoji || '📝',
        blocks: args.content
          ? markdownToBlocks(args.content)
          : [{ id: uid(), type: 'paragraph', content: '', checked: false }],
        createdAt: '',
        updatedAt: '',
      });
      return { content: [{ type: 'text', text: `✅ 새 페이지 **${doc.emoji} ${doc.title}** 가 생성되었습니다.\n- id: \`${doc.id}\`\n- 그룹: ${group.emoji} ${group.name}` }] };
    }

    case 'strategy_create_group': {
      const group = await dbCreateGroup({ id: uid(), name: args.name, emoji: args.emoji || '📁' });
      return { content: [{ type: 'text', text: `✅ 새 그룹 **${group.emoji} ${group.name}** 이 생성되었습니다.\n- id: \`${group.id}\`` }] };
    }

    case 'strategy_update_page_title': {
      const patch: Partial<{ title: string; emoji: string }> = {};
      if (args.title) patch.title = args.title;
      if (args.emoji) patch.emoji = args.emoji;
      const doc = await dbUpdateDoc(args.pageId, patch);
      return { content: [{ type: 'text', text: `✅ 페이지가 **${doc.emoji} ${doc.title}** 로 업데이트되었습니다.` }] };
    }

    case 'strategy_delete_page': {
      const doc = await dbGetDoc(args.pageId);
      if (!doc) return { content: [{ type: 'text', text: `페이지를 찾을 수 없습니다: ${args.pageId}` }] };
      await dbDeleteDoc(args.pageId);
      return { content: [{ type: 'text', text: `✅ **${doc.emoji} ${doc.title}** 페이지가 삭제되었습니다.` }] };
    }

    default:
      throw new Error(`알 수 없는 도구: ${name}`);
  }
}

// ─── route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { method, params, id } = body;

  // Notifications (no id) don't need a response
  if (id === undefined || id === null) {
    return new NextResponse(null, { status: 202 });
  }

  const ok = (result: unknown) =>
    NextResponse.json({ jsonrpc: '2.0', id, result });
  const err = (code: number, message: string) =>
    NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } });

  try {
    if (method === 'initialize') {
      return ok({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'strategy', version: '2.0.0' },
        capabilities: { tools: {} },
      });
    }

    if (method === 'tools/list') {
      return ok({ tools: TOOLS });
    }

    if (method === 'tools/call') {
      const result = await handleTool(params.name, params.arguments || {});
      return ok(result);
    }

    return err(-32601, 'Method not found');
  } catch (e) {
    return err(-32603, e instanceof Error ? e.message : '내부 오류');
  }
}

// Stateless HTTP transport: GET not supported
export function GET() {
  return new NextResponse('MCP Streamable HTTP — POST only', { status: 405 });
}
