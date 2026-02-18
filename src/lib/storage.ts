/**
 * 에피소드 스토리지 유틸리티 (Supabase 기반)
 * 기존 localStorage API와 동일한 함수 시그니처 유지 (async로 변경)
 */
import {
  getAllEpisodes,
  getProjectEpisodes,
  upsertEpisodes,
  upsertEpisode,
  deleteEpisode,
  deleteProjectEpisodes,
} from './supabase/db';
import type { Episode } from '@/types';

interface EpisodeWithProjectId extends Episode {
  projectId: string;
}

/**
 * 에피소드 여러 개를 안전하게 업데이트 (upsert)
 */
export async function updateEpisodesInStorage(
  episodesToUpdate: EpisodeWithProjectId[]
): Promise<boolean> {
  return upsertEpisodes(episodesToUpdate);
}

/**
 * 단일 에피소드를 안전하게 업데이트 (upsert)
 */
export async function updateEpisodeInStorage(
  episode: EpisodeWithProjectId
): Promise<boolean> {
  return upsertEpisode(episode);
}

/**
 * 에피소드 삭제
 */
export async function deleteEpisodeFromStorage(episodeId: string): Promise<boolean> {
  return deleteEpisode(episodeId);
}

/**
 * 프로젝트의 모든 에피소드 삭제
 */
export async function deleteProjectEpisodesFromStorage(projectId: string): Promise<boolean> {
  return deleteProjectEpisodes(projectId);
}

/**
 * 모든 에피소드 가져오기
 */
export async function getAllEpisodesFromStorage(): Promise<EpisodeWithProjectId[]> {
  return getAllEpisodes();
}

/**
 * 특정 프로젝트의 에피소드 가져오기
 */
export async function getProjectEpisodesFromStorage(
  projectId: string
): Promise<EpisodeWithProjectId[]> {
  return getProjectEpisodes(projectId);
}
