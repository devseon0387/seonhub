#!/usr/bin/env python3
"""
video-moment MCP Server
Vbot이 비모 대시보드 데이터에 접근할 수 있도록 하는 MCP 서버

환경변수:
    SUPABASE_URL               : Supabase 프로젝트 URL
    SUPABASE_SERVICE_ROLE_KEY  : service_role 키 (RLS 우회, Supabase 대시보드 > Settings > API)
"""

import asyncio
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from supabase import create_client, Client


# ── Supabase 초기화 ──────────────────────────────────────────────────────────

def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다\n"
            "Supabase 대시보드 > Settings > API > service_role 키를 사용하세요."
        )
    return create_client(url, key)


# ── 헬퍼 ────────────────────────────────────────────────────────────────────

def fmt(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2, default=str)

def today_kst() -> datetime:
    return datetime.now(timezone(timedelta(hours=9)))


# ── MCP 서버 정의 ────────────────────────────────────────────────────────────

server = Server("video-moment")


@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    return [
        Tool(
            name="get_summary",
            description=(
                "비모 대시보드 전체 현황 요약을 가져옵니다. "
                "진행중 프로젝트 수, 에피소드 현황, 이번달 매니징 수익, "
                "마감 임박 에피소드 등을 한눈에 확인할 수 있습니다. "
                "매일 아침 보고나 슬랙 요약 메시지에 활용하세요."
            ),
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="list_projects",
            description=(
                "프로젝트 목록을 가져옵니다. "
                "status로 필터 가능: planning(기획중), in_progress(진행중), "
                "completed(완료), on_hold(보류). 생략하면 전체 조회."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "필터할 프로젝트 상태",
                        "enum": ["planning", "in_progress", "completed", "on_hold"],
                    }
                },
            },
        ),
        Tool(
            name="get_project",
            description=(
                "특정 프로젝트의 상세 정보와 해당 프로젝트에 속한 "
                "에피소드(회차) 목록을 함께 가져옵니다."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "프로젝트 ID (UUID 형식)",
                    }
                },
                "required": ["project_id"],
            },
        ),
        Tool(
            name="list_episodes",
            description=(
                "에피소드(회차) 목록을 가져옵니다. "
                "status, 담당 파트너 ID, 프로젝트 ID로 필터 가능. "
                "status: waiting(대기), in_progress(진행중), review(검토중), completed(완료)"
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "에피소드 상태 필터",
                        "enum": ["waiting", "in_progress", "review", "completed"],
                    },
                    "assignee_id": {
                        "type": "string",
                        "description": "담당 파트너의 ID",
                    },
                    "project_id": {
                        "type": "string",
                        "description": "특정 프로젝트 ID로 필터",
                    },
                },
            },
        ),
        Tool(
            name="get_upcoming_deadlines",
            description=(
                "마감 임박 에피소드 목록을 가져옵니다. "
                "완료되지 않은 에피소드 중 오늘부터 N일 이내에 마감인 항목을 반환합니다. "
                "기본값은 7일."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "몇 일 이내 마감인 에피소드를 조회할지 (기본: 7)",
                    }
                },
            },
        ),
        Tool(
            name="list_partners",
            description=(
                "파트너 목록을 가져옵니다. "
                "status로 필터 가능: active(활성), inactive(비활성). 생략하면 전체."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "파트너 활성 상태 필터",
                        "enum": ["active", "inactive"],
                    }
                },
            },
        ),
        Tool(
            name="list_clients",
            description=(
                "클라이언트 목록을 가져옵니다. "
                "status로 필터 가능: active, inactive. 생략하면 전체."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "클라이언트 활성 상태 필터",
                        "enum": ["active", "inactive"],
                    }
                },
            },
        ),
        Tool(
            name="update_project_status",
            description=(
                "프로젝트 상태를 변경합니다. "
                "completed로 변경 시 completed_at 타임스탬프가 자동 기록됩니다."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "변경할 프로젝트 ID",
                    },
                    "status": {
                        "type": "string",
                        "description": "새로운 상태",
                        "enum": ["planning", "in_progress", "completed", "on_hold"],
                    },
                },
                "required": ["project_id", "status"],
            },
        ),
        Tool(
            name="update_episode_status",
            description=(
                "에피소드(회차) 상태를 변경합니다. "
                "파트너가 납품 완료했을 때, 검토 중일 때 등 상태 업데이트에 사용하세요."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "episode_id": {
                        "type": "string",
                        "description": "변경할 에피소드 ID",
                    },
                    "status": {
                        "type": "string",
                        "description": "새로운 상태",
                        "enum": ["waiting", "in_progress", "review", "completed"],
                    },
                },
                "required": ["episode_id", "status"],
            },
        ),
        Tool(
            name="list_portfolio",
            description=(
                "포트폴리오 목록을 가져옵니다. "
                "published_only=true로 공개된 항목만 필터할 수 있습니다. "
                "생략하면 전체(공개+비공개) 조회."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "published_only": {
                        "type": "boolean",
                        "description": "true이면 공개된 포트폴리오만 반환",
                    }
                },
            },
        ),
        Tool(
            name="add_portfolio_item",
            description=(
                "새 포트폴리오 항목을 추가합니다. "
                "title, client, youtube_url은 필수입니다."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "포트폴리오 제목",
                    },
                    "client": {
                        "type": "string",
                        "description": "클라이언트 이름",
                    },
                    "youtube_url": {
                        "type": "string",
                        "description": "유튜브 영상 URL",
                    },
                    "description": {
                        "type": "string",
                        "description": "포트폴리오 설명 (선택)",
                    },
                    "completed_at": {
                        "type": "string",
                        "description": "완료일 (YYYY-MM-DD, 선택)",
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "태그 목록 (선택)",
                    },
                    "is_published": {
                        "type": "boolean",
                        "description": "즉시 공개 여부 (기본: false)",
                    },
                },
                "required": ["title", "client", "youtube_url"],
            },
        ),
        Tool(
            name="toggle_portfolio_published",
            description=(
                "포트폴리오 항목의 공개/비공개 상태를 전환합니다."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "포트폴리오 항목 ID (UUID)",
                    },
                    "is_published": {
                        "type": "boolean",
                        "description": "true=공개, false=비공개",
                    },
                },
                "required": ["id", "is_published"],
            },
        ),
        Tool(
            name="get_marketing_stats",
            description=(
                "마케팅 현황 요약을 가져옵니다. "
                "포트폴리오 공개/비공개 수, 클라이언트별 완료 프로젝트 수를 반환합니다."
            ),
            inputSchema={"type": "object", "properties": {}},
        ),
    ]


@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[TextContent]:
    supabase = get_supabase()
    try:
        if name == "get_summary":
            result = await _get_summary(supabase)
        elif name == "list_projects":
            result = await _list_projects(supabase, arguments)
        elif name == "get_project":
            result = await _get_project(supabase, arguments)
        elif name == "list_episodes":
            result = await _list_episodes(supabase, arguments)
        elif name == "get_upcoming_deadlines":
            result = await _get_upcoming_deadlines(supabase, arguments)
        elif name == "list_partners":
            result = await _list_partners(supabase, arguments)
        elif name == "list_clients":
            result = await _list_clients(supabase, arguments)
        elif name == "update_project_status":
            result = await _update_project_status(supabase, arguments)
        elif name == "update_episode_status":
            result = await _update_episode_status(supabase, arguments)
        elif name == "list_portfolio":
            result = await _list_portfolio(supabase, arguments)
        elif name == "add_portfolio_item":
            result = await _add_portfolio_item(supabase, arguments)
        elif name == "toggle_portfolio_published":
            result = await _toggle_portfolio_published(supabase, arguments)
        elif name == "get_marketing_stats":
            result = await _get_marketing_stats(supabase)
        else:
            result = {"error": f"알 수 없는 도구: {name}"}
    except Exception as e:
        result = {"error": str(e)}

    return [TextContent(type="text", text=fmt(result))]


# ── 도구 구현 ────────────────────────────────────────────────────────────────

async def _get_summary(supabase: Client) -> dict:
    now = today_kst()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    projects = (supabase.table("projects")
                .select("id, title, status, total_amount, management_fee, completed_at")
                .execute().data or [])

    episodes = (supabase.table("episodes")
                .select("id, project_id, episode_number, title, status, due_date, assignee")
                .execute().data or [])

    today_str = now.strftime("%Y-%m-%d")
    cutoff_7 = (now + timedelta(days=7)).strftime("%Y-%m-%d")

    upcoming = sorted(
        [e for e in episodes
         if e.get("due_date") and today_str <= e["due_date"] <= cutoff_7
         and e["status"] != "completed"],
        key=lambda x: x["due_date"]
    )

    this_month_fee = sum(
        p.get("management_fee", 0) or 0
        for p in projects
        if p.get("completed_at") and p["completed_at"] >= month_start
    )

    return {
        "as_of": now.strftime("%Y-%m-%d %H:%M KST"),
        "projects": {
            "total": len(projects),
            "planning": sum(1 for p in projects if p["status"] == "planning"),
            "in_progress": sum(1 for p in projects if p["status"] == "in_progress"),
            "completed": sum(1 for p in projects if p["status"] == "completed"),
            "on_hold": sum(1 for p in projects if p["status"] == "on_hold"),
        },
        "episodes": {
            "total": len(episodes),
            "waiting": sum(1 for e in episodes if e["status"] == "waiting"),
            "in_progress": sum(1 for e in episodes if e["status"] == "in_progress"),
            "review": sum(1 for e in episodes if e["status"] == "review"),
            "completed": sum(1 for e in episodes if e["status"] == "completed"),
        },
        "this_month_management_fee": this_month_fee,
        "upcoming_deadlines_7days": len(upcoming),
        "upcoming_deadlines_preview": upcoming[:5],
    }


async def _list_projects(supabase: Client, args: dict) -> list:
    query = supabase.table("projects").select("*").order("created_at", desc=True)
    if status := args.get("status"):
        query = query.eq("status", status)
    return query.execute().data or []


async def _get_project(supabase: Client, args: dict) -> dict:
    project_id = args["project_id"]
    project = (supabase.table("projects")
               .select("*")
               .eq("id", project_id)
               .single()
               .execute().data)
    episodes = (supabase.table("episodes")
                .select("*")
                .eq("project_id", project_id)
                .order("episode_number")
                .execute().data or [])
    return {"project": project, "episodes": episodes}


async def _list_episodes(supabase: Client, args: dict) -> list:
    query = supabase.table("episodes").select("*").order("due_date", desc=False)
    if status := args.get("status"):
        query = query.eq("status", status)
    if assignee := args.get("assignee_id"):
        query = query.eq("assignee", assignee)
    if project_id := args.get("project_id"):
        query = query.eq("project_id", project_id)
    return query.execute().data or []


async def _get_upcoming_deadlines(supabase: Client, args: dict) -> list:
    days = int(args.get("days", 7))
    now = today_kst()
    today_str = now.strftime("%Y-%m-%d")
    cutoff = (now + timedelta(days=days)).strftime("%Y-%m-%d")

    return (supabase.table("episodes")
            .select("id, project_id, episode_number, title, status, due_date, assignee")
            .gte("due_date", today_str)
            .lte("due_date", cutoff)
            .neq("status", "completed")
            .order("due_date")
            .execute().data or [])


async def _list_partners(supabase: Client, args: dict) -> list:
    query = supabase.table("partners").select("*").order("created_at", desc=True)
    if status := args.get("status"):
        query = query.eq("status", status)
    return query.execute().data or []


async def _list_clients(supabase: Client, args: dict) -> list:
    query = supabase.table("clients").select("*").order("created_at", desc=True)
    if status := args.get("status"):
        query = query.eq("status", status)
    return query.execute().data or []


async def _update_project_status(supabase: Client, args: dict) -> dict:
    project_id = args["project_id"]
    status = args["status"]
    updates: dict = {"status": status, "updated_at": datetime.utcnow().isoformat()}
    if status == "completed":
        updates["completed_at"] = datetime.utcnow().isoformat()
    result = (supabase.table("projects")
              .update(updates)
              .eq("id", project_id)
              .execute())
    return {"success": True, "project_id": project_id, "new_status": status}


async def _update_episode_status(supabase: Client, args: dict) -> dict:
    episode_id = args["episode_id"]
    status = args["status"]
    updates = {"status": status, "updated_at": datetime.utcnow().isoformat()}
    result = (supabase.table("episodes")
              .update(updates)
              .eq("id", episode_id)
              .execute())
    return {"success": True, "episode_id": episode_id, "new_status": status}


async def _list_portfolio(supabase: Client, args: dict) -> list:
    query = supabase.table("portfolio_items").select("*").order("created_at", desc=True)
    if args.get("published_only"):
        query = query.eq("is_published", True)
    return query.execute().data or []


async def _add_portfolio_item(supabase: Client, args: dict) -> dict:
    row = {
        "title": args["title"],
        "client": args["client"],
        "youtube_url": args["youtube_url"],
        "description": args.get("description"),
        "completed_at": args.get("completed_at"),
        "tags": args.get("tags", []),
        "is_published": args.get("is_published", False),
    }
    result = (supabase.table("portfolio_items")
              .insert(row)
              .select()
              .single()
              .execute())
    return {"success": True, "item": result.data}


async def _toggle_portfolio_published(supabase: Client, args: dict) -> dict:
    item_id = args["id"]
    is_published = args["is_published"]
    (supabase.table("portfolio_items")
     .update({"is_published": is_published, "updated_at": datetime.utcnow().isoformat()})
     .eq("id", item_id)
     .execute())
    return {"success": True, "id": item_id, "is_published": is_published}


async def _get_marketing_stats(supabase: Client) -> dict:
    portfolio = (supabase.table("portfolio_items")
                 .select("id, title, client, is_published")
                 .execute().data or [])

    projects = (supabase.table("projects")
                .select("id, client, status")
                .execute().data or [])

    clients = (supabase.table("clients")
               .select("id, name, status")
               .execute().data or [])

    # 클라이언트별 프로젝트 집계
    client_stats = {}
    for p in projects:
        client_name = p.get("client") or "미지정"
        if client_name not in client_stats:
            client_stats[client_name] = {"total": 0, "completed": 0}
        client_stats[client_name]["total"] += 1
        if p["status"] == "completed":
            client_stats[client_name]["completed"] += 1

    return {
        "portfolio": {
            "total": len(portfolio),
            "published": sum(1 for p in portfolio if p["is_published"]),
            "unpublished": sum(1 for p in portfolio if not p["is_published"]),
        },
        "clients": {
            "total": len(clients),
            "active": sum(1 for c in clients if c["status"] == "active"),
        },
        "projects_by_client": client_stats,
    }


# ── 엔트리포인트 ─────────────────────────────────────────────────────────────

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
