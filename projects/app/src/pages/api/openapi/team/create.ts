import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { createTeam } from './controller';
import { authOpenApiKey } from '@fastgpt/service/support/openapi/auth';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';

export type CreateTeamBody = {
  /** 拥有者 */
  ownerId?: string;
  /** 成员ID */
  tmbId?: string;
  teamId: string;
  teamName: string;
  avatar: string;
  balance: number;
};

/**
 * 创建租户
 * @param req 请求
 * @param res 响应
 * @returns
 */
async function handler(req: ApiRequestProps<CreateTeamBody>): Promise<string> {
  const body = req.body as CreateTeamBody;

  const { teamId, tmbId, appId } = await authOpenApiKey({
    apikey: req.headers.authorization || ''
  });
  const member = await MongoTeamMember.findOne({ _id: tmbId }).lean();
  const teamAvatar = body.avatar || '/icon/logo.svg';
  const id = await mongoSessionRun(async (session) => {
    // 创建租户
    return await createTeam({
      ownerId: body.ownerId || member?.userId,
      id: body.teamId,
      name: body.teamName || 'My Team',
      avatar: teamAvatar,
      balance: body.balance || 0,
      session
    });
  });
  return id || '';
}

export default NextAPI(handler);
