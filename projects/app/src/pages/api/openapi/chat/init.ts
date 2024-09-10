import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { getGuideModule, getAppChatConfig } from '@fastgpt/global/core/workflow/utils';
import { getChatModelNameListByModules } from '@/service/core/app/workflow';
import type { InitChatResponse } from '@/global/core/chat/api.d';
import { MongoChat } from '@fastgpt/service/core/chat/chatSchema';
import { getChatItems } from '@fastgpt/service/core/chat/controller';
import { DispatchNodeResponseKeyEnum } from '@fastgpt/global/core/workflow/runtime/constants';
import { getAppLatestVersion } from '@fastgpt/service/core/app/controller';
import { NextAPI } from '@/service/middleware/entry';
import { FlowNodeTypeEnum } from '@fastgpt/global/core/workflow/node/constant';
import { transformPreviewHistories } from '@/global/core/chat/utils';
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
import { authOpenApiKey2 } from '@fastgpt/service/support/openapi/auth';
import { parseHeader } from '../tool';
import { MongoApp } from '@fastgpt/service/core/app/schema';

type InitChatBody = {
  appId?: string;
  chatId?: string;
  loadCustomFeedbacks?: boolean;
};

/**
 * 初始化聊天接口（获取聊天历史）
 * @param req 请求
 * @param res 响应
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<InitChatResponse | void> {
  const { authorization: authToken, teamId, userId } = parseHeader(req.headers);
  await authOpenApiKey2({ apikey: authToken || '', teamId: teamId || '', userId: userId || '' });
  let { appId, chatId, loadCustomFeedbacks } = req.body as InitChatBody;

  // 获取应用
  const app = await MongoApp.findById(appId).lean();
  if (!app || !appId) {
    return jsonRes(res, {
      code: 501,
      message: "You don't have an app yet"
    });
  }
  const chat = chatId ? await MongoChat.findOne({ appId, chatId }) : undefined;

  // 获取聊天历史
  const [{ histories }, { nodes, chatConfig }] = await Promise.all([
    getChatItems({
      appId,
      chatId,
      limit: 30,
      field: `dataId obj value adminFeedback userBadFeedback userGoodFeedback ${
        DispatchNodeResponseKeyEnum.nodeResponse
      } ${loadCustomFeedbacks ? 'customFeedbacks' : ''}`
    }),
    getAppLatestVersion(app._id, app)
  ]);
  const pluginInputs =
    app?.modules?.find((node) => node.flowNodeType === FlowNodeTypeEnum.pluginInput)?.inputs ?? [];

  return {
    chatId,
    appId,
    title: chat?.title,
    userAvatar: undefined,
    variables: chat?.variables || {},
    history: app.type === AppTypeEnum.plugin ? histories : transformPreviewHistories(histories),
    app: {
      chatConfig: getAppChatConfig({
        chatConfig,
        systemConfigNode: getGuideModule(nodes),
        storeVariables: chat?.variableList,
        storeWelcomeText: chat?.welcomeText,
        isPublicFetch: false
      }),
      chatModels: getChatModelNameListByModules(nodes),
      name: app.name,
      avatar: app.avatar,
      intro: app.intro,
      type: app.type,
      pluginInputs
    }
  };
}

export default NextAPI(handler);

export const config = {
  api: {
    responseLimit: '10mb'
  }
};
