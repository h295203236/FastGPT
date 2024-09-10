import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { MongoChat } from '@fastgpt/service/core/chat/chatSchema';
import { NextAPI } from '@/service/middleware/entry';
import { ApiRequestProps } from '@fastgpt/service/type/next';
import { parseHeader } from '../tool';
import { authOpenApiKey2 } from '@fastgpt/service/support/openapi/auth';

type UpdateHistoryBody = {
  appId: string;
  chatId: string;
  title?: string;
  customTitle?: string;
  top?: number;
};

/**
 * 更新聊天接口
 * @param req 请求
 * @param res 响应
 */
async function handler(req: ApiRequestProps<UpdateHistoryBody>, res: NextApiResponse) {
  const { authorization: authToken, teamId, userId } = parseHeader(req.headers);
  await authOpenApiKey2({ apikey: authToken || '', teamId: teamId || '', userId: userId || '' });

  const { appId, chatId, title, customTitle, top } = req.body as UpdateHistoryBody;
  await MongoChat.findOneAndUpdate(
    { appId, chatId },
    {
      updateTime: new Date(),
      ...(title !== undefined && { title }),
      ...(customTitle !== undefined && { customTitle }),
      ...(top !== undefined && { top })
    }
  );
  jsonRes(res);
}

export default NextAPI(handler);
