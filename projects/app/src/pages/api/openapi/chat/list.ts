import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoChat } from '@fastgpt/service/core/chat/chatSchema';
import type { ChatHistoryItemType } from '@fastgpt/global/core/chat/type.d';
import { ChatSourceEnum } from '@fastgpt/global/core/chat/constants';
import { parseHeader } from '../tool';
import { authOpenApiKey2 } from '@fastgpt/service/support/openapi/auth';

type GetHistoriesBody = {
  appId: string;
  limit?: number;
  searchKey?: string;
};

/**
 * 获取聊天历史接口
 * @param req 请求
 * @param res 响应
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();
    const { authorization: authToken, teamId, userId } = parseHeader(req.headers);
    const { tmbId } = await authOpenApiKey2({
      apikey: authToken || '',
      teamId: teamId || '',
      userId: userId || ''
    });
    const { appId, limit, searchKey } = req.body as GetHistoriesBody;

    const match = await (async () => {
      if (appId && searchKey) {
        return {
          tmbId,
          appId,
          title: { $regex: new RegExp(searchKey, 'i') },
          source: ChatSourceEnum.online
        };
      } else if (appId) {
        return {
          tmbId,
          appId,
          source: ChatSourceEnum.online
        };
      }

      return Promise.reject('Params are error');
    })();

    const data = await MongoChat.find(match, 'chatId title top customTitle appId updateTime')
      .sort({ top: -1, updateTime: -1 })
      .limit(limit ?? 30);

    jsonRes<ChatHistoryItemType[]>(res, {
      data: data.map((item) => ({
        chatId: item.chatId,
        updateTime: item.updateTime,
        appId: item.appId,
        customTitle: item.customTitle,
        title: item.title,
        top: item.top
      }))
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
