import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { addUserToTeam, getTeam } from '../team/controller';
import { getUser } from './controller';
import {
  TeamMemberRoleEnum,
  TeamMemberStatusEnum
} from '@fastgpt/global/support/user/team/constant';

export type AddToTeamBody = {
  /** 用户ID */
  userId: string;
  /** 租户ID */
  teamId: string;
  /** 租户成员ID */
  tmbId?: string;
  /** 租户成员角色 */
  role: string;
  /** 租户成员状态 */
  status: string;
  /** 是否默认租户 */
  defaultTeam: boolean;
};

/**
 * 加入租户
 * @param req 请求
 * @param res 响应
 */
async function handler(req: ApiRequestProps<AddToTeamBody>): Promise<boolean> {
  const body = req.body as AddToTeamBody;
  const existTeam = await getTeam(body.teamId);
  if (!existTeam) {
    return Promise.reject('该租户不存在');
  }
  const existUser = await getUser(body.userId);
  if (!existUser) {
    return Promise.reject('该用户不存在');
  }

  // 加入租户
  return await mongoSessionRun(async (session) => {
    return await addUserToTeam({
      id: body.tmbId,
      teamId: body.teamId,
      userId: body.userId,
      name: existUser.username,
      role: body.role || TeamMemberRoleEnum.member,
      status: body.status || TeamMemberStatusEnum.active,
      defaultTeam: body.defaultTeam,
      session
    });
  });
}

export default NextAPI(handler);
