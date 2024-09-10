import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoChatItem } from '@fastgpt/service/core/chat/chatItemSchema';
import { parseHeader } from '../../tool';
import { authOpenApiKey2 } from '@fastgpt/service/support/openapi/auth';

type UpdateChatFeedbackBody = {
  /** 应用ID */
  appId: string;
  /** 会话ID */
  chatId: string;
  /** 会话项ID */
  dataId: string;
  /** 用户反馈差评 */
  userBadFeedback?: string;
  /** 用户反馈好评 */
  userGoodFeedback?: string;
};

/**
 * 用户反馈接口
 * @param req 请求
 * @param res 响应
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { appId, chatId, dataId, userBadFeedback, userGoodFeedback } =
    req.body as UpdateChatFeedbackBody;

  try {
    if (!dataId) {
      throw new Error('dataId is required');
    }

    const { authorization: apikey, teamId, userId } = parseHeader(req.headers);
    await authOpenApiKey2({ apikey: apikey || '', teamId: teamId || '', userId: userId || '' });

    await connectToDatabase();

    await MongoChatItem.findOneAndUpdate(
      {
        appId,
        chatId,
        dataId: dataId
      },
      {
        $unset: {
          ...(userBadFeedback === undefined && { userBadFeedback: '' }),
          ...(userGoodFeedback === undefined && { userGoodFeedback: '' })
        },
        $set: {
          ...(userBadFeedback !== undefined && { userBadFeedback }),
          ...(userGoodFeedback !== undefined && { userGoodFeedback })
        }
      }
    );

    jsonRes(res);
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
