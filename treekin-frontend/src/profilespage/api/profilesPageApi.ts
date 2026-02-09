import { http } from "../../lib/http";
import type {
  UUID,
  UserCreateRequest,
  UserResponse,
  ProfileUpsertRequest,
  ProfileResponse,
  TreeCreateRequest,
  TreeResponse,
  PostCreateRequest,
  PostResponse,
  CreditCreateRequest,
  CreditResponse,
  ProfilePageResponse,
} from "./types";

const base = "/api/profiles-page";

export const profilesPageApi = {
  // Aggregate
  getProfilePage(userId: UUID) {
    return http<ProfilePageResponse>(`${base}/${userId}`);
  },

  // Users
  createUser(req: UserCreateRequest) {
    return http<UserResponse>(`${base}/users`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  },
  listUsers() {
    return http<UserResponse[]>(`${base}/users`);
  },

  // Profiles
  getProfile(userId: UUID) {
    return http<ProfileResponse>(`${base}/profiles/${userId}`);
  },
  upsertProfile(userId: UUID, req: ProfileUpsertRequest) {
    return http<ProfileResponse>(`${base}/profiles/${userId}`, {
      method: "PUT",
      body: JSON.stringify(req),
    });
  },

  // Trees
  createTree(req: TreeCreateRequest) {
    return http<TreeResponse>(`${base}/trees`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  },
  listTreesByUser(userId: UUID) {
    return http<TreeResponse[]>(`${base}/trees/by-user/${userId}`);
  },
  deleteTree(treeId: UUID) {
    return http<void>(`${base}/trees/${treeId}`, { method: "DELETE" });
  },

  // Posts
  createPost(req: PostCreateRequest) {
    return http<PostResponse>(`${base}/posts`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  },
  listPostsByUser(userId: UUID) {
    return http<PostResponse[]>(`${base}/posts/by-user/${userId}`);
  },
  deletePost(postId: UUID) {
    return http<void>(`${base}/posts/${postId}`, { method: "DELETE" });
  },

  // Credits
  createCredit(req: CreditCreateRequest) {
    return http<CreditResponse>(`${base}/credits`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  },
  listCreditsByUser(userId: UUID) {
    return http<CreditResponse[]>(`${base}/credits/by-user/${userId}`);
  },
  deleteCredit(creditId: UUID) {
    return http<void>(`${base}/credits/${creditId}`, { method: "DELETE" });
  },
};
