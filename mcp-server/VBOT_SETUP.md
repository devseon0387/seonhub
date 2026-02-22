# video-moment MCP 서버 — Vbot 연동 가이드

## 1. 패키지 설치

Vbot의 Python 환경에서:

```bash
cd /Users/vimo/Desktop/agent
source .venv/bin/activate
pip install mcp supabase
```

---

## 2. Supabase Service Role Key 발급

> **중요:** NEXT_PUBLIC_SUPABASE_ANON_KEY는 RLS에 막혀 동작하지 않습니다.
> Service Role Key를 사용해야 합니다.

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 > **Settings** > **API**
3. **service_role** 항목의 키 복사

---

## 3. Vbot .env에 환경변수 추가

`/Users/vimo/Desktop/agent/.env`에 추가:

```env
# video-moment MCP
SUPABASE_URL=https://qxyiifphpsthrwxplafd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<위에서 복사한 service_role 키>
```

---

## 4. slack_bot.py에 MCP 서버 등록

`mcp_servers` 딕셔너리에 추가:

```python
mcp_servers["video_moment"] = {
    "command": "python",
    "args": ["/Users/vimo/video-moment/mcp-server/server.py"],
    "env": {
        "SUPABASE_URL": os.environ.get("SUPABASE_URL", ""),
        "SUPABASE_SERVICE_ROLE_KEY": os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""),
    },
}
```

---

## 5. 시스템 프롬프트에 가이드 섹션 추가

`build_system_prompt()` 함수 안에 추가:

```
## 비모(video-moment) 대시보드 연동 가이드

비모 대시보드는 MCP로 연결되어 있어 직접 데이터를 조회하고 수정할 수 있습니다.

### 사용 가능한 도구

- **get_summary** : 전체 현황 요약 (프로젝트 수, 에피소드 현황, 이번달 매출, 마감 임박)
- **list_projects** : 프로젝트 목록 조회. status 필터: planning / in_progress / completed / on_hold
- **get_project** : 프로젝트 상세 + 에피소드 목록 (project_id 필요)
- **list_episodes** : 에피소드 목록. status / assignee_id / project_id 필터 가능
- **get_upcoming_deadlines** : N일 이내 마감 에피소드 (기본 7일)
- **list_partners** : 파트너 목록
- **list_clients** : 클라이언트 목록
- **update_project_status** : 프로젝트 상태 변경
- **update_episode_status** : 에피소드 상태 변경

### 활용 예시

- "오늘 비모 현황 보고해줘" → get_summary 호출 후 슬랙에 정리
- "이번 주 마감인 에피소드 있어?" → get_upcoming_deadlines(days=7)
- "진행중인 프로젝트 목록 보여줘" → list_projects(status="in_progress")
- "A 프로젝트 상태를 완료로 바꿔줘" → list_projects로 ID 확인 후 update_project_status
```

---

## 6. Vbot 재시작

```bash
cd /Users/vimo/Desktop/agent
source .venv/bin/activate
export $(cat .env | grep -v '^#' | xargs)
python slack_bot.py &
```

---

## 7. 제공되는 MCP 도구 목록

| 도구 | 설명 |
|------|------|
| `get_summary` | 전체 현황 요약 (매일 아침 보고용) |
| `list_projects` | 프로젝트 목록 (status 필터) |
| `get_project` | 프로젝트 상세 + 에피소드 목록 |
| `list_episodes` | 에피소드 목록 (status/담당자/프로젝트 필터) |
| `get_upcoming_deadlines` | N일 이내 마감 에피소드 |
| `list_partners` | 파트너 목록 |
| `list_clients` | 클라이언트 목록 |
| `update_project_status` | 프로젝트 상태 변경 |
| `update_episode_status` | 에피소드 상태 변경 |
