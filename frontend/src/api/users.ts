import type { User, UserDetail } from "./models";
import { apiFetch, extractError } from "./client";

export async function listUsers(
  params: {
    offset?: number;
    limit?: number;
    order?: "asc" | "desc" | "social";
    query?: string;
    nickname?: string;
    focus_user_id?: string;
  } = {},
): Promise<User[]> {
  const search = new URLSearchParams();
  if (params.offset !== undefined) search.append("offset", String(params.offset));
  if (params.limit !== undefined) search.append("limit", String(params.limit));
  if (params.order) search.append("order", params.order);
  if (params.query) search.append("query", params.query);
  if (params.nickname) search.append("nickname", params.nickname);
  if (params.focus_user_id) search.append("focus_user_id", params.focus_user_id);
  const res = await apiFetch(`/users?${search}`, { method: "GET" });
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

export async function listUsersDetail(
  params: {
    offset?: number;
    limit?: number;
    order?: "asc" | "desc" | "social";
    query?: string;
    nickname?: string;
    focus_user_id?: string;
  } = {},
): Promise<UserDetail[]> {
  const search = new URLSearchParams();
  if (params.offset !== undefined) search.append("offset", String(params.offset));
  if (params.limit !== undefined) search.append("limit", String(params.limit));
  if (params.order) search.append("order", params.order);
  if (params.query) search.append("query", params.query);
  if (params.nickname) search.append("nickname", params.nickname);
  if (params.focus_user_id) search.append("focus_user_id", params.focus_user_id);
  const res = await apiFetch(`/users/detail?${search}`, { method: "GET" });
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

export async function getUser(id: string): Promise<User> {
  const res = await apiFetch(`/users/${id}`, { method: "GET" });
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

export async function getUserDetail(id: string, focus_user_id?: string): Promise<UserDetail> {
  const search = new URLSearchParams();
  if (focus_user_id) search.append("focus_user_id", focus_user_id);
  const res = await apiFetch(`/users/${id}/detail?${search}`, { method: "GET" });
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

export async function createUser(
  user: Omit<User, "id" | "created_at"> & { password: string },
): Promise<User> {
  const res = await apiFetch("/users", {
    method: "POST",
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

export async function updateUser(
  id: string,
  user: Partial<Omit<User, "id" | "created_at">>,
): Promise<User> {
  const res = await apiFetch(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

export async function deleteUser(id: string): Promise<{ result: string }> {
  const res = await apiFetch(`/users/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

export async function updateUserPassword(
  id: string,
  password: string,
): Promise<{ result: string }> {
  const res = await apiFetch(`/users/${id}/password`, {
    method: "PUT",
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

export async function addFollower(id: string): Promise<{ result: string }> {
  const res = await apiFetch(`/users/${id}/follow`, { method: "POST" });
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

export async function removeFollower(id: string): Promise<{ result: string }> {
  const res = await apiFetch(`/users/${id}/follow`, { method: "DELETE" });
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

export async function listFollowees(
  id: string,
  params: {
    offset?: number;
    limit?: number;
    order?: "asc" | "desc";
    focus_user_id?: string;
  } = {},
): Promise<UserDetail[]> {
  const search = new URLSearchParams();
  if (params.offset !== undefined) search.append("offset", String(params.offset));
  if (params.limit !== undefined) search.append("limit", String(params.limit));
  if (params.order) search.append("order", params.order);
  if (params.focus_user_id) search.append("focus_user_id", params.focus_user_id);
  const res = await apiFetch(`/users/${id}/followees/detail?${search}`, { method: "GET" });
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

export async function listFollowers(
  id: string,
  params: {
    offset?: number;
    limit?: number;
    order?: "asc" | "desc";
    focus_user_id?: string;
  } = {},
): Promise<UserDetail[]> {
  const search = new URLSearchParams();
  if (params.offset !== undefined) search.append("offset", String(params.offset));
  if (params.limit !== undefined) search.append("limit", String(params.limit));
  if (params.order) search.append("order", params.order);
  if (params.focus_user_id) search.append("focus_user_id", params.focus_user_id);
  const res = await apiFetch(`/users/${id}/followers/detail?${search}`, { method: "GET" });
  if (!res.ok) throw new Error(await extractError(res));
  return res.json();
}

export async function countUsers(
  params: { nickname?: string; query?: string } = {},
): Promise<number> {
  const search = new URLSearchParams();
  if (params.nickname) search.append("nickname", params.nickname);
  if (params.query) search.append("query", params.query);
  const res = await apiFetch(`/users/count?${search}`, { method: "GET" });
  if (!res.ok) throw new Error(await extractError(res));
  return (await res.json()).count;
}
