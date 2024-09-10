import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoChatItem } from '@fastgpt/service/core/chat/chatItemSchema';
import { authChatCrud } from '@/service/support/permission/auth/chat';
import type { DeleteChatItemProps } from '@/global/core/chat/api.d';
import { NextAPI } from '@/service/middleware/entry';
import { ApiRequestProps } from '@fastgpt/service/type/next';
import { WritePermissionVal } from '@fastgpt/global/support/permission/constant';
import { parseHeader } from '../../tool';
import { authOpenApiKey2 } from '@fastgpt/service/support/openapi/auth';

type DeleteChatItemBody = {
  appId: string;
  chatId: string;
  dataId: string;
};

/**
 * 删除指定聊天内容
 * @param req 请求
 * @param res 响应
 */
async function handler(req: ApiRequestProps<DeleteChatItemBody>, res: NextApiResponse) {
  const { authorization: authToken, teamId, userId } = parseHeader(req.headers);
  await authOpenApiKey2({ apikey: authToken || '', teamId: teamId || '', userId: userId || '' });

  const { appId, chatId, dataId } = req.body as DeleteChatItemBody;

  if (!dataId || !chatId) {
    return jsonRes(res);
  }

  await authChatCrud({
    req,
    authToken: true,
    ...req.query,
    per: WritePermissionVal
  });

  await MongoChatItem.deleteOne({
    appId,
    chatId,
    dataId: dataId
  });

  jsonRes(res);
}

export default NextAPI(handler);
