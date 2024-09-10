import { InitUserBody } from '@/global/core/user/api';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { ApiRequestProps } from '@fastgpt/service/type/next';
import { createUser } from './controller';
import { UserStatusEnum } from '@fastgpt/global/support/user/constant';
import { addUserToTeam } from '../team/controller';
import {
  TeamMemberRoleEnum,
  TeamMemberStatusEnum
} from '@fastgpt/global/support/user/team/constant';
import { NextAPI } from '@/service/middleware/entry';

/**
 * 用户初始化
 * 1、创建用户
 * 2、加入租户, 默认租户
 * @param req
 */
async function handler(req: ApiRequestProps<InitUserBody>): Promise<string> {
  const body = req.body as InitUserBody;
  // 创建用户
  const id = await mongoSessionRun(async (session) => {
    // 创建用户
    const id = await createUser({
      userId: body.userId,
      username: body.username,
      password: body.password,
      avatar: '/icon/human.svg',
      timezone: 'Asia/Shanghai',
      status: UserStatusEnum.active,
      createTime: new Date(),
      session
    });
    // 加入租户
    if (!!body.teamId) {
      await addUserToTeam({
        id: body.tmbId,
        teamId: body.teamId,
        userId: body.userId,
        name: body.username,
        role: TeamMemberRoleEnum.member,
        status: TeamMemberStatusEnum.active,
        defaultTeam: true,
        session
      });
    }
    return id;
  });
  return id || '';
}

export default NextAPI(handler);
