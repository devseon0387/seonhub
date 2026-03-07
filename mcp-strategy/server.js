import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ─── API 설정 ─────────────────────────────────────────────────────────────────
const BASE_URL = (process.env.STRATEGY_BASE_URL || 'https://video-moment.vercel.app').replace(/\/$/, '');

const API_KEY = process.env.API_SECRET_KEY || '';

async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} → ${res.status}: ${text}`);
  }
  if (method === 'DELETE') return { ok: true };
  return res.json();
}

const get  = (path)       => api('GET',    path);
const post = (path, body) => api('POST',   path, body);
const put  = (path, body) => api('PUT',    path, body);
const del  = (path)       => api('DELETE', path);

// ─── uid ──────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);

// ─── 마크다운 ↔ 블록 변환 ─────────────────────────────────────────────────────
function markdownToBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  for (const line of lines) {
    const t = line.trimEnd();
    if (t.startsWith('### ')) {
      blocks.push({ id: uid(), type: 'heading3', content: t.slice(4), checked: false });
    } else if (t.startsWith('## ')) {
      blocks.push({ id: uid(), type: 'heading2', content: t.slice(3), checked: false });
    } else if (t.startsWith('# ')) {
      blocks.push({ id: uid(), type: 'heading1', content: t.slice(2), checked: false });
    } else if (t.startsWith('- ')) {
      blocks.push({ id: uid(), type: 'bullet', content: t.slice(2), checked: false });
    } else if (/^\d+\.\s/.test(t)) {
      blocks.push({ id: uid(), type: 'numbered', content: t.replace(/^\d+\.\s/, ''), checked: false });
    } else if (t.startsWith('[x] ')) {
      blocks.push({ id: uid(), type: 'todo', content: t.slice(4), checked: true });
    } else if (t.startsWith('[ ] ') || t.startsWith('[] ')) {
      blocks.push({ id: uid(), type: 'todo', content: t.replace(/^\[[ ]?\] /, ''), checked: false });
    } else if (t === '---') {
      blocks.push({ id: uid(), type: 'divider', content: '', checked: false });
    } else if (t.startsWith('> ')) {
      blocks.push({ id: uid(), type: 'callout', content: t.slice(2), checked: false });
    } else {
      blocks.push({ id: uid(), type: 'paragraph', content: t, checked: false });
    }
  }
  if (blocks.length === 0) {
    blocks.push({ id: uid(), type: 'paragraph', content: '', checked: false });
  }
  return blocks;
}

function blocksToMarkdown(blocks) {
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

// ─── MCP 서버 ─────────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'strategy', version: '2.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'strategy_list_groups',
      description: '전략 그룹 목록을 조회합니다.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'strategy_list_pages',
      description: '특정 그룹의 페이지 목록을 조회합니다.',
      inputSchema: {
        type: 'object',
        properties: { groupId: { type: 'string', description: '그룹 ID' } },
        required: ['groupId'],
      },
    },
    {
      name: 'strategy_read_page',
      description: '페이지의 전체 내용을 마크다운 형식으로 읽습니다.',
      inputSchema: {
        type: 'object',
        properties: { pageId: { type: 'string', description: '페이지 ID' } },
        required: ['pageId'],
      },
    },
    {
      name: 'strategy_write_page',
      description: '페이지 내용을 마크다운으로 작성합니다. 기존 내용을 완전히 교체합니다.\n\n지원 문법:\n- `# 제목` → H1\n- `## 제목` → H2\n- `### 제목` → H3\n- `- 항목` → 글머리\n- `1. 항목` → 번호 목록\n- `[ ] 항목` → 할 일\n- `[x] 항목` → 완료된 할 일\n- `---` → 구분선\n- `> 텍스트` → 콜아웃\n- 일반 텍스트 → 단락',
      inputSchema: {
        type: 'object',
        properties: {
          pageId: { type: 'string', description: '페이지 ID' },
          content: { type: 'string', description: '마크다운 형식의 내용' },
        },
        required: ['pageId', 'content'],
      },
    },
    {
      name: 'strategy_append_to_page',
      description: '페이지 끝에 내용을 추가합니다. 기존 내용은 유지됩니다.',
      inputSchema: {
        type: 'object',
        properties: {
          pageId: { type: 'string', description: '페이지 ID' },
          content: { type: 'string', description: '추가할 마크다운 내용' },
        },
        required: ['pageId', 'content'],
      },
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
      inputSchema: {
        type: 'object',
        properties: { pageId: { type: 'string', description: '페이지 ID' } },
        required: ['pageId'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  try {
    switch (name) {

      case 'strategy_list_groups': {
        const groups = await get('/api/strategy/groups');
        if (!groups.length) return { content: [{ type: 'text', text: '아직 그룹이 없습니다.' }] };
        const lines = await Promise.all(groups.map(async g => {
          const docs = await get(`/api/strategy/docs?groupId=${g.id}`);
          return `${g.emoji} **${g.name}** (id: \`${g.id}\`, 페이지 ${docs.length}개)`;
        }));
        return { content: [{ type: 'text', text: `## 전략 그룹 목록\n\n${lines.join('\n')}` }] };
      }

      case 'strategy_list_pages': {
        const { groupId } = args;
        const [groups, docs] = await Promise.all([
          get('/api/strategy/groups'),
          get(`/api/strategy/docs?groupId=${groupId}`),
        ]);
        const group = groups.find(g => g.id === groupId);
        if (!group) return { content: [{ type: 'text', text: `그룹을 찾을 수 없습니다: ${groupId}` }] };
        if (!docs.length) return { content: [{ type: 'text', text: `${group.emoji} **${group.name}** — 아직 페이지가 없습니다.` }] };
        const lines = docs.map(d => {
          const date = new Date(d.updatedAt).toLocaleDateString('ko-KR');
          return `${d.emoji} **${d.title}** (id: \`${d.id}\`, 수정: ${date})`;
        });
        return { content: [{ type: 'text', text: `## ${group.emoji} ${group.name}\n\n${lines.join('\n')}` }] };
      }

      case 'strategy_read_page': {
        const { pageId } = args;
        const [doc, groups] = await Promise.all([
          get(`/api/strategy/docs/${pageId}`),
          get('/api/strategy/groups'),
        ]);
        if (doc.error) return { content: [{ type: 'text', text: `페이지를 찾을 수 없습니다: ${pageId}` }] };
        const group = groups.find(g => g.id === doc.groupId);
        const md = blocksToMarkdown(doc.blocks);
        const header = [
          `# ${doc.emoji} ${doc.title}`,
          `> 그룹: ${group ? `${group.emoji} ${group.name}` : doc.groupId}`,
          `> 마지막 수정: ${new Date(doc.updatedAt).toLocaleString('ko-KR')}`,
          '', '---', '',
        ].join('\n');
        return { content: [{ type: 'text', text: header + md }] };
      }

      case 'strategy_write_page': {
        const { pageId, content } = args;
        const doc = await put(`/api/strategy/docs/${pageId}`, { blocks: markdownToBlocks(content) });
        if (doc.error) return { content: [{ type: 'text', text: `페이지를 찾을 수 없습니다: ${pageId}` }] };
        return { content: [{ type: 'text', text: `✅ **${doc.title}** 페이지가 업데이트되었습니다.` }] };
      }

      case 'strategy_append_to_page': {
        const { pageId, content } = args;
        const doc = await get(`/api/strategy/docs/${pageId}`);
        if (doc.error) return { content: [{ type: 'text', text: `페이지를 찾을 수 없습니다: ${pageId}` }] };
        const existing = doc.blocks.filter((b, i) =>
          !(i === doc.blocks.length - 1 && b.type === 'paragraph' && !b.content)
        );
        const updated = await put(`/api/strategy/docs/${pageId}`, {
          blocks: [...existing, ...markdownToBlocks(content)],
        });
        return { content: [{ type: 'text', text: `✅ **${updated.title}** 페이지에 내용이 추가되었습니다.` }] };
      }

      case 'strategy_create_page': {
        const { groupId, title, content, emoji = '📝' } = args;
        const groups = await get('/api/strategy/groups');
        const group = groups.find(g => g.id === groupId);
        if (!group) return { content: [{ type: 'text', text: `그룹을 찾을 수 없습니다: ${groupId}` }] };
        const doc = await post('/api/strategy/docs', {
          id: uid(),
          groupId,
          title,
          emoji,
          blocks: content
            ? markdownToBlocks(content)
            : [{ id: uid(), type: 'paragraph', content: '', checked: false }],
        });
        return { content: [{ type: 'text', text: `✅ 새 페이지 **${emoji} ${title}** 가 생성되었습니다.\n- id: \`${doc.id}\`\n- 그룹: ${group.emoji} ${group.name}` }] };
      }

      case 'strategy_create_group': {
        const { name, emoji = '📁' } = args;
        const group = await post('/api/strategy/groups', { id: uid(), name, emoji });
        return { content: [{ type: 'text', text: `✅ 새 그룹 **${emoji} ${name}** 이 생성되었습니다.\n- id: \`${group.id}\`` }] };
      }

      case 'strategy_update_page_title': {
        const { pageId, title, emoji } = args;
        const patch = {};
        if (title) patch.title = title;
        if (emoji) patch.emoji = emoji;
        const doc = await put(`/api/strategy/docs/${pageId}`, patch);
        if (doc.error) return { content: [{ type: 'text', text: `페이지를 찾을 수 없습니다: ${pageId}` }] };
        return { content: [{ type: 'text', text: `✅ 페이지가 **${doc.emoji} ${doc.title}** 로 업데이트되었습니다.` }] };
      }

      case 'strategy_delete_page': {
        const { pageId } = args;
        const doc = await get(`/api/strategy/docs/${pageId}`);
        if (doc.error) return { content: [{ type: 'text', text: `페이지를 찾을 수 없습니다: ${pageId}` }] };
        await del(`/api/strategy/docs/${pageId}`);
        return { content: [{ type: 'text', text: `✅ **${doc.emoji} ${doc.title}** 페이지가 삭제되었습니다.` }] };
      }

      default:
        return { content: [{ type: 'text', text: `알 수 없는 도구: ${name}` }], isError: true };
    }
  } catch (err) {
    return { content: [{ type: 'text', text: `오류: ${err.message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
