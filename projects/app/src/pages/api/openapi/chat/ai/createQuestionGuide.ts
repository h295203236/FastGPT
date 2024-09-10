import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { pushQuestionGuideUsage } from '@/service/support/wallet/usage/push';
import { createQuestionGuide } from '@fastgpt/service/core/ai/functions/createQuestionGuide';
import { ChatCompletionMessageParam } from '@fastgpt/global/core/ai/type';
import { parseHeader } from '../../tool';
import { authOpenApiKey2 } from '@fastgpt/service/support/openapi/auth';

type CreateQuestionGuideBody = {
  /** 自定义提示词 */
  customPrompt?: string;
  /** 忽略前面的对话内容 */
  ignoreChatHistory?: boolean;
  /** 消息列表 */
  messages: ChatCompletionMessageParam[];
};

/**
 * 创建问题引导接口
 * @param req 请求
 * @param res 响应
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    const { authorization: apikey, teamId, userId } = parseHeader(req.headers);
    const { tmbId } = await authOpenApiKey2({
      apikey: apikey || '',
      teamId: teamId || '',
      userId: userId || ''
    });

    await connectToDatabase();
    const { customPrompt, ignoreChatHistory, messages } = req.body as CreateQuestionGuideBody;

    const qgModel = global.llmModels[0];

    const { result, tokens } = await createQuestionGuide({
      customPrompt,
      ignoreChatHistory,
      messages,
      model: qgModel.model
    });

    jsonRes(res, {
      data: result
    });

    pushQuestionGuideUsage({
      tokens,
      teamId: teamId || '',
      tmbId: tmbId || ''
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
