import { CreateUserParams, InitUserBody } from '@/global/core/user/api';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { ApiRequestProps } from '@fastgpt/service/type/next';
import { createUser } from './controller';
import { UserStatusEnum } from '@fastgpt/global/support/user/constant';
import { NextAPI } from '@/service/middleware/entry';

/**
 * 创建用户
 * @param req
 */
async function handler(req: ApiRequestProps<CreateUserParams>): Promise<string> {
  const body = req.body as InitUserBody;
  const id = await mongoSessionRun(async (session) => {
    // 创建用户
    return await createUser({
      userId: body.userId,
      username: body.username,
      password: body.password,
      avatar: '',
      timezone: '',
      status: UserStatusEnum.active,
      createTime: new Date(),
      session
    });
  });
  return id || '';
}

export default NextAPI(handler);
