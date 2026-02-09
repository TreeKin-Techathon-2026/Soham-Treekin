export type UUID = string;

export type UserResponse = {
  userId: UUID;
  userName: string;
  userUsername: string;
  userEmail: string;
  isActive: boolean;
  createdAt: string;
};

export type ProfileResponse = {
  userId: UUID;
  profilePic: string | null;
  bio: string | null;
  location: string | null;
  bannerPic: string | null;
};

export type TreeResponse = {
  treeId: UUID;
  userId: UUID;
  relationType: "PLANT" | "ADOPT" | "SPONSOR" | string;
  status: "ACTIVE" | "NEEDS_ATTENTION" | "DEAD" | string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
};

export type PostResponse = {
  postId: UUID;
  userId: UUID;
  treeId: UUID;
  postUrl: string;
  createdAt: string;
};

export type CreditResponse = {
  creditId: UUID;
  userId: UUID;
  creditType: "CARBON" | "TREDIT" | string;
  amount: number;
  createdAt: string;
};

export type ProfilePageResponse = {
  user: UserResponse;
  profile: ProfileResponse | null;
  trees: TreeResponse[];
  posts: PostResponse[];
  credits: CreditResponse[];
  followersCount: number;
  followingCount: number;
};

export type UserCreateRequest = {
  userName: string;
  userUsername: string;
  userEmail: string;
  userPass: string;
};

export type ProfileUpsertRequest = {
  profilePic?: string | null;
  bio?: string | null;
  location?: string | null;
  bannerPic?: string | null;
};

export type TreeCreateRequest = {
  userId: UUID;
  relationType: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type PostCreateRequest = {
  userId: UUID;
  treeId: UUID;
  postUrl: string;
};

export type CreditCreateRequest = {
  userId: UUID;
  creditType: string;
  amount: number;
};
