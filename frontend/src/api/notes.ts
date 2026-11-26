/**
 * 笔记数据访问：公开列表/详情 + 管理端 CRUD。
 * 基于统一 api 客户端；本项目的 API 契约定义在 src/api/contract.ts。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateNoteInput, Note, NoteListQuery, UpdateNoteInput } from './contract';
import { api } from './client';

type NoteList = { items: Note[]; total: number; page: number; pageSize: number };

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
