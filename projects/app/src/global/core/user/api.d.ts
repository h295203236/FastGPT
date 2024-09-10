/* ================= user ===================== */
export type CreateUserParams = {
  userId: string;
  status: string;
  username: string;
  password: string;
  avatar: string;
  timezone: string;
  createTime: Date;
};

export type UpdateUserParams = {
  userId: string;
  status: string;
  username: string;
  password: string;
  avatar: string;
  timezone: string;
  createTime: Date;
};

export type InitUserBody = {
  userId: string;
  username: string;
  password: string;
  avatar: string;
  timezone: string;
  createTime: Date;
  teamId?: string;
  tmbId?: string;
};
