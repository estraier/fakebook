export type Post = {
  id: string;
  content: string;
  owned_by: string;
  reply_to: string | null;
  created_at: string;
};

export type PostDetail = Post & {
  owner_nickname: string;
  reply_to_owner_nickname: string | null;
  reply_count: number;
  like_count: number;
  tags: string[];
  is_liked_by_focus_user?: boolean;
  is_replied_by_focus_user?: boolean;
};

export type PostFilter = {
  query?: string;
  owned_by?: string;
  tag?: string;
  reply_to?: string | null;
};

export type PostPagination = {
  offset?: number;
  limit?: number;
  order?: "asc" | "desc";
};

export type CountPostsInput = PostFilter;

export type ListPostsInput = PostFilter & PostPagination;

export type CreatePostInput = {
  content: string;
  owned_by: string;
  reply_to: string | null;
  tags: string[];
};

export type UpdatePostInput = {
  id: string;
  owned_by?: string;
  content?: string;
  reply_to?: string | null;
  tags?: string[];
};

export type ListPostsByFolloweesDetailInput = {
  user_id: string;
  include_self?: boolean;
  include_replies?: boolean;
} & PostPagination;

export type ListPostsLikedByUserDetailInput = {
  user_id: string;
  include_replies?: boolean;
} & PostPagination;

export type ListLikersInput = {
  post_id: string;
} & PostPagination;
