import { defaultPermissionEnum } from '@/components/support/permission/DefaultPerList';

export type CreateTeamParams = {
  /** 拥有者 */
  ownerId?: string;
  /** 成员ID */
  tmbId?: string;
  /** 租户ID */
  id: string;
  /** 租户名称 */
  name: string;
  /** 头像 */
  avatar: string;
  /** 余额 */
  balance: number;
};

export type UpdateTeamParams = {
  /** 租户ID */
  id: string;
  /** 租户名称 */
  name: string;
  /** 头像 */
  avatar: string;
  /** 余额 */
  balance: number;
};
