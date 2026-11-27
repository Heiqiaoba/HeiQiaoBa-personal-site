/**
 * 笔记数据访问：公开列表/详情 + 管理端 CRUD。
 * 基于统一 api 客户端；本项目的 API 契约定义在 src/api/contract.ts。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateNoteInput, Note, NoteListQuery, UpdateNoteInput } from './contract';
import { api } from './client';

type NoteList = { items: Note[]; total: number; page: number; pageSize: number };
type LikeResponse = { liked: boolean; likeCount: number };

const VISITOR_KEY = 'visitor_id';

/**
 * 访客标识：localStorage 持久化，登录前后都稳定，用于点赞去重。
 * 隐私模式下存储不可用则退化为内存 ID（刷新后变化，可接受）。
 */
let memoryVisitorId: string | null = null;
export function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id =
      typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    memoryVisitorId ??=
      typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return memoryVisitorId;
  }
}

async function fetchNotes(query: Partial<NoteListQuery> = {}): Promise<NoteList> {
  return api.get<NoteList>('/notes', { params: query });
}
async function fetchNote(slug: string): Promise<Note> {
  return api.get<Note>(`/notes/${encodeURIComponent(slug)}`);
}

export function useNotes(query: Partial<NoteListQuery> = {}) {
  return useQuery({
    queryKey: ['notes', query],
    queryFn: () => fetchNotes(query),
  });
}

/** 图片管理（管理端） */
export type StoredImage = { name: string; url: string; size: number; createdAt: string };
export function useImages() {
  return useQuery({
    queryKey: ['images'],
    queryFn: () => api.get<StoredImage[]>('/images'),
  });
}
export function useDeleteImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.delete(`/images/${encodeURIComponent(name)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['images'] }),
  });
}

/** 标签列表（含已发布笔记计数） */
type TagCount = { name: string; count: number };
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get<TagCount[]>('/tags'),
  });
}
export function useNote(slug: string) {
  return useQuery({ queryKey: ['note', slug], queryFn: () => fetchNote(slug) });
}

/** 当前访客是否已点赞某笔记 */
export function useLikeStatus(noteId: string | undefined) {
  return useQuery({
    queryKey: ['like', noteId],
    queryFn: () =>
      api.get<{ liked: boolean }>('/notes/' + noteId + '/like', {
        params: { visitorId: getVisitorId() },
      }),
    enabled: !!noteId,
  });
}

/** 点赞 / 取消点赞（切换） */
export function useToggleLike(noteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<LikeResponse>(`/notes/${noteId}/like`, { visitorId: getVisitorId() }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['like', noteId] });
      void qc.invalidateQueries({ queryKey: ['note'] });
      void qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

// ---- 管理端 ----
async function fetchAdminNotes(query: Partial<NoteListQuery> = {}): Promise<NoteList> {
  return api.get<NoteList>('/admin/notes', { params: query });
}
async function fetchAdminNote(id: string): Promise<Note> {
  return api.get<Note>(`/admin/notes/${id}`);
}
async function createNote(input: CreateNoteInput): Promise<Note> {
  return api.post<Note>('/admin/notes', input);
}
async function updateNote({ id, ...input }: UpdateNoteInput & { id: string }): Promise<Note> {
  return api.patch<Note>(`/admin/notes/${id}`, input);
}
async function deleteNote(id: string): Promise<void> {
  await api.delete(`/admin/notes/${id}`);
}

export function useAdminNotes(query: Partial<NoteListQuery> = {}) {
  return useQuery({ queryKey: ['admin', 'notes', query], queryFn: () => fetchAdminNotes(query) });
}
export function useAdminNote(id: string) {
  return useQuery({ queryKey: ['admin', 'note', id], queryFn: () => fetchAdminNote(id), enabled: !!id });
}
export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createNote,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'notes'] }),
  });
}
export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notes'] });
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteNote,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'notes'] }),
  });
}

/** 一键发布草稿：调 PATCH 把 status 改为 published，后端会自动补 publishedAt */
export function usePublishNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => updateNote({ id, status: 'published' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notes'] });
      qc.invalidateQueries({ queryKey: ['notes'] });
      qc.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
