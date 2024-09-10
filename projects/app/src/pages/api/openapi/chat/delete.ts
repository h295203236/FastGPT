import type { NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { MongoChat } from '@fastgpt/service/core/chat/chatSchema';
import { MongoChatItem } from '@fastgpt/service/core/chat/chatItemSchema';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { NextAPI } from '@/service/middleware/entry';
import { ApiRequestProps } from '@fastgpt/service/type/next';
import { deleteChatFiles } from '@fastgpt/service/core/chat/controller';
import { parseHeader } from '../tool';
import { authOpenApiKey2 } from '@fastgpt/service/support/openapi/auth';

type DelHistoryBody = {
  appId: string;
  chatId: string;
};

/**
 * 清空某chat下的所有聊天记录接口
 * @param req 请求
 * @param res 响应
 */
async function handler(req: ApiRequestProps<DelHistoryBody>, res: NextApiResponse) {
  const { authorization: authToken, teamId, userId } = parseHeader(req.headers);
  const { tmbId } = await authOpenApiKey2({
    apikey: authToken || '',
    teamId: teamId || '',
    userId: userId || ''
  });

  const { appId, chatId } = req.body as DelHistoryBody;
  await deleteChatFiles({ chatIdList: [chatId] });
  await mongoSessionRun(async (session) => {
    await MongoChatItem.deleteMany(
      {
        appId,
        chatId
      },
      { session }
    );
    await MongoChat.deleteOne(
      {
        appId,
        chatId
      },
      { session }
    );
  });

  jsonRes(res);
}

export default NextAPI(handler);
