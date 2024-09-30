import type { NextApiRequest, NextApiResponse } from 'next';
import { sseErrRes, jsonRes } from '@fastgpt/service/common/response';
import { addLog } from '@fastgpt/service/common/system/log';
import { ChatRoleEnum, ChatSourceEnum } from '@fastgpt/global/core/chat/constants';
import { SseResponseEventEnum } from '@fastgpt/global/core/workflow/runtime/constants';
import { dispatchWorkFlow } from '@fastgpt/service/core/workflow/dispatch';
import type { ChatCompletionCreateParams } from '@fastgpt/global/core/ai/type.d';
import type { ChatCompletionMessageParam } from '@fastgpt/global/core/ai/type.d';
import {
  getWorkflowEntryNodeIds,
  getMaxHistoryLimitFromNodes,
  initWorkflowEdgeStatus,
  storeNodes2RuntimeNodes,
  textAdaptGptResponse,
  getLastInteractiveValue
} from '@fastgpt/global/core/workflow/runtime/utils';
import { GPTMessages2Chats, chatValue2RuntimePrompt } from '@fastgpt/global/core/chat/adapt';
import { getChatItems } from '@fastgpt/service/core/chat/controller';
import { saveChat, updateInteractiveChat } from '@fastgpt/service/core/chat/saveChat';
import { responseWrite } from '@fastgpt/service/common/response';
import { pushChatUsage } from '@/service/support/wallet/usage/push';
import { pushResult2Remote, addOutLinkUsage } from '@fastgpt/service/support/outLink/tools';
import requestIp from 'request-ip';
import { getUsageSourceByAuthType } from '@fastgpt/global/support/wallet/usage/tools';
import {
  concatHistories,
  getChatTitleFromChatMessage,
  removeEmptyUserInput
} from '@fastgpt/global/core/chat/utils';
import { updateApiKeyUsage } from '@fastgpt/service/support/openapi/tools';
import { MongoApp } from '@fastgpt/service/core/app/schema';
import { MongoChat } from '@fastgpt/service/core/chat/chatSchema';
import { OutLinkChatAuthProps } from '@fastgpt/global/support/permission/chat';
import { AIChatItemType, UserChatItemType } from '@fastgpt/global/core/chat/type';
import { DispatchNodeResponseKeyEnum } from '@fastgpt/global/core/workflow/runtime/constants';

import { NextAPI } from '@/service/middleware/entry';
import { getAppLatestVersion } from '@fastgpt/service/core/app/controller';
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
import { updatePluginInputByVariables } from '@fastgpt/global/core/workflow/utils';
import { getNanoid } from '@fastgpt/global/common/string/tools';
import { getSystemTime } from '@fastgpt/global/common/time/timezone';
import { rewriteNodeOutputByHistories } from '@fastgpt/global/core/workflow/runtime/utils';
import { getWorkflowResponseWrite } from '@fastgpt/service/core/workflow/dispatch/utils';
import { getPluginRunUserQuery } from '@fastgpt/service/core/workflow/utils';
import { parseHeader } from '../../tool';
import { authOpenApiKey2 } from '@fastgpt/service/support/openapi/auth';
import { MongoUser } from '@fastgpt/service/support/user/schema';

type FastGptWebChatProps = {
  chatId?: string; // undefined: get histories from messages, '': new chat, 'xxxxx': get histories from db
  appId?: string;
};

export type Props = ChatCompletionCreateParams &
  FastGptWebChatProps &
  OutLinkChatAuthProps & {
    messages: ChatCompletionMessageParam[];
    responseChatItemId?: string;
    stream?: boolean;
    detail?: boolean;
    variables: Record<string, any>; // Global variables or plugin inputs
  };

/**
 * 与AI对话
 * @param req 请求
 * @param res 响应
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.on('close', () => {
    res.end();
  });
  res.on('error', () => {
    console.log('error: ', 'request error');
    res.end();
  });

  let {
    chatId,
    appId,
    // share chat
    shareId,
    outLinkUid,
    // team chat
    teamId: spaceTeamId,

    stream = false,
    detail = false,
    messages = [],
    variables = {},
    responseChatItemId = getNanoid()
  } = req.body as Props;

  const originIp = requestIp.getClientIp(req);

  const startTime = Date.now();

  try {
    if (!Array.isArray(messages)) {
      throw new Error('messages is not array');
    }

    /* 
      Web params: chatId + [Human]
      API params: chatId + [Human]
      API params: [histories, Human]
    */
    const chatMessages = GPTMessages2Chats(messages);

    // Computed start hook params
    const startHookText = (() => {
      // Chat
      const userQuestion = chatMessages[chatMessages.length - 1] as UserChatItemType | undefined;
      if (userQuestion) return chatValue2RuntimePrompt(userQuestion.value).text;

      // plugin
      return JSON.stringify(variables);
    })();

    const authType = 'apikey';
    const { authorization: apikey, teamId, userId } = parseHeader(req.headers);
    const { tmbId } = await authOpenApiKey2({
      apikey: apikey || '',
      teamId: teamId || '',
      userId: userId || ''
    });
    const app = await MongoApp.findById(appId).lean();
    if (!app) {
      throw new Error('app not found');
    }
    const user = await MongoUser.findById(userId).lean();
    if (!user) {
      throw new Error('user not found');
    }
    const isPlugin = app.type === AppTypeEnum.plugin;

    // Check message type
    if (isPlugin) {
      detail = true;
    } else {
      if (messages.length === 0) {
        throw new Error('messages is empty');
      }
    }

    // Get obj=Human history
    const userQuestion: UserChatItemType = (() => {
      if (isPlugin) {
        return getPluginRunUserQuery(app.modules, variables);
      }

      const latestHumanChat = chatMessages.pop() as UserChatItemType | undefined;
      if (!latestHumanChat) {
        throw new Error('User question is empty');
      }
      return latestHumanChat;
    })();

    // Get and concat history;
    const limit = getMaxHistoryLimitFromNodes(app.modules);
    const [{ histories }, { nodes, edges, chatConfig }, chatDetail] = await Promise.all([
      getChatItems({
        appId: app._id,
        chatId,
        limit,
        field: `dataId obj value nodeOutputs`
      }),
      getAppLatestVersion(app._id, app),
      MongoChat.findOne({ appId: app._id, chatId }, 'source variableList variables')
    ]);

    // Get store variables(Api variable precedence)
    if (chatDetail?.variables) {
      variables = {
        ...chatDetail.variables,
        ...variables
      };
    }

    // Get chat histories
    const newHistories = concatHistories(histories, chatMessages);

    // Get runtimeNodes
    let runtimeNodes = storeNodes2RuntimeNodes(nodes, getWorkflowEntryNodeIds(nodes, newHistories));
    if (isPlugin) {
      // Assign values to runtimeNodes using variables
      runtimeNodes = updatePluginInputByVariables(runtimeNodes, variables);
      // Plugin runtime does not need global variables(It has been injected into the pluginInputNode)
      variables = {};
    }
    runtimeNodes = rewriteNodeOutputByHistories(newHistories, runtimeNodes);

    const workflowResponseWrite = getWorkflowResponseWrite({
      res,
      detail,
      streamResponse: stream,
      id: chatId || getNanoid(24)
    });

    /* start flow controller */
    const { flowResponses, flowUsages, assistantResponses, newVariables } = await (async () => {
      if (app.version === 'v2') {
        return dispatchWorkFlow({
          res,
          requestOrigin: req.headers.origin,
          mode: 'chat',
          user,

          runningAppInfo: {
            id: String(app._id),
            teamId: String(app.teamId),
            tmbId: String(app.tmbId)
          },
          uid: String(tmbId),

          chatId,
          responseChatItemId,
          runtimeNodes,
          runtimeEdges: initWorkflowEdgeStatus(edges, newHistories),
          variables,
          query: removeEmptyUserInput(userQuestion.value),
          chatConfig,
          histories: newHistories,
          stream,
          maxRunTimes: 200,
          workflowStreamResponse: workflowResponseWrite
        });
      }
      return Promise.reject('请升级工作流');
    })();

    // save chat
    if (chatId) {
      const isOwnerUse = !shareId && !spaceTeamId && String(tmbId) === String(app.tmbId);
      const source = (() => {
        if (shareId) {
          return ChatSourceEnum.share;
        }
        if (authType === 'apikey') {
          return ChatSourceEnum.api;
        }
        if (spaceTeamId) {
          return ChatSourceEnum.team;
        }
        return ChatSourceEnum.online;
      })();

      const isInteractiveRequest = !!getLastInteractiveValue(histories);
      const { text: userSelectedVal } = chatValue2RuntimePrompt(userQuestion.value);

      const newTitle = isPlugin
        ? variables.cTime ?? getSystemTime(user.timezone)
        : getChatTitleFromChatMessage(userQuestion);

      const aiResponse: AIChatItemType & { dataId?: string } = {
        dataId: responseChatItemId,
        obj: ChatRoleEnum.AI,
        value: assistantResponses,
        [DispatchNodeResponseKeyEnum.nodeResponse]: flowResponses
      };

      if (isInteractiveRequest) {
        await updateInteractiveChat({
          chatId,
          appId: app._id,
          teamId: app.teamId,
          tmbId: tmbId,
          userSelectedVal,
          aiResponse,
          newVariables,
          newTitle
        });
      } else {
        await saveChat({
          chatId,
          appId: app._id,
          teamId: app.teamId,
          tmbId: tmbId,
          nodes,
          appChatConfig: chatConfig,
          variables: newVariables,
          isUpdateUseTime: isOwnerUse, // owner update use time
          newTitle,
          shareId,
          outLinkUid: undefined,
          source: ChatSourceEnum.online,
          content: [userQuestion, aiResponse],
          metadata: {
            originIp
          }
        });
      }
    }

    addLog.info(`completions running time: ${(Date.now() - startTime) / 1000}s`);

    /* select fe response field */
    const feResponseData = flowResponses;

    if (stream) {
      workflowResponseWrite({
        event: SseResponseEventEnum.answer,
        data: textAdaptGptResponse({
          text: null,
          finish_reason: 'stop'
        })
      });
      responseWrite({
        res,
        event: detail ? SseResponseEventEnum.answer : undefined,
        data: '[DONE]'
      });

      if (detail) {
        workflowResponseWrite({
          event: SseResponseEventEnum.flowResponses,
          data: feResponseData
        });
      }

      res.end();
    } else {
      const responseContent = (() => {
        if (assistantResponses.length === 0) return '';
        if (assistantResponses.length === 1 && assistantResponses[0].text?.content)
          return assistantResponses[0].text?.content;

        if (!detail) {
          return assistantResponses
            .map((item) => item?.text?.content)
            .filter(Boolean)
            .join('\n');
        }

        return assistantResponses;
      })();

      res.json({
        ...(detail ? { responseData: feResponseData, newVariables } : {}),
        id: chatId || '',
        model: '',
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 1 },
        choices: [
          {
            message: { role: 'assistant', content: responseContent },
            finish_reason: 'stop',
            index: 0
          }
        ]
      });
    }

    // add record
    const { totalPoints } = pushChatUsage({
      appName: app.name,
      appId: app._id,
      teamId: app.teamId,
      tmbId: tmbId,
      source: getUsageSourceByAuthType({ shareId, authType }),
      flowUsages
    });

    if (shareId) {
      pushResult2Remote({ outLinkUid, shareId, appName: app.name, flowResponses });
      addOutLinkUsage({
        shareId,
        totalPoints
      });
    }
    if (apikey) {
      updateApiKeyUsage({
        apikey,
        totalPoints
      });
    }
  } catch (err) {
    if (stream) {
      sseErrRes(res, err);
      res.end();
    } else {
      jsonRes(res, {
        code: 500,
        error: err
      });
    }
  }
}
export default NextAPI(handler);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb'
    },
    responseLimit: '20mb'
  }
};
