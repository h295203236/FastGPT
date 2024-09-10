import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { MongoChat } from '@fastgpt/service/core/chat/chatSchema';
import { MongoChatItem } from '@fastgpt/service/core/chat/chatItemSchema';
import { ChatSourceEnum } from '@fastgpt/global/core/chat/constants';
import { NextAPI } from '@/service/middleware/entry';
import { deleteChatFiles } from '@fastgpt/service/core/chat/controller';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { authOpenApiKey2 } from '@fastgpt/service/support/openapi/auth';
import { parseHeader } from '../tool';

type ClearHistoryBody = {
  appId: string;
};

/**
 * 清空所有聊天记录接口
 * @param req 请求
 * @param res 响应
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorization: authToken, teamId, userId } = parseHeader(req.headers);
  const { tmbId } = await authOpenApiKey2({
    apikey: authToken || '',
    teamId: teamId || '',
    userId: userId || ''
  });

  const { appId } = req.body as ClearHistoryBody;
  let chatAppId = appId!;

  const match = await (async () => {
    if (appId) {
      return {
        tmbId,
        appId,
        source: ChatSourceEnum.online
      };
    }

    return Promise.reject('Param are error');
  })();

  // find chatIds
  const list = await MongoChat.find(match, 'chatId').lean();
  const idList = list.map((item) => item.chatId);

  await deleteChatFiles({ chatIdList: idList });

  await mongoSessionRun(async (session) => {
    await MongoChatItem.deleteMany(
      {
        appId: chatAppId,
        chatId: { $in: idList }
      },
      { session }
    );
    await MongoChat.deleteMany(
      {
        appId: chatAppId,
        chatId: { $in: idList }
      },
      { session }
    );
  });

  jsonRes(res);
}

export default NextAPI(handler);
