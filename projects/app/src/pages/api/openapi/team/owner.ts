import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { getTeam, setTeamOwner } from './controller';

export type setTeamOwnerBody = {
  /** 拥有者 */
  ownerId: string;
  teamId: string;
};

/**
 * 设置租户拥有者
 * @param req 请求
 * @param res 响应
 * @returns
 */
async function handler(req: ApiRequestProps<setTeamOwnerBody>): Promise<boolean> {
  const body = req.body as setTeamOwnerBody;
  const existTeam = await getTeam(body.teamId);
  if (!existTeam) {
    return Promise.reject('该租户不存在');
  }
  // 设置租户拥有者
  return await mongoSessionRun(async (session) => {
    return await setTeamOwner({
      teamId: body.teamId,
      ownerId: body.ownerId,
      session
    });
  });
}

export default NextAPI(handler);
