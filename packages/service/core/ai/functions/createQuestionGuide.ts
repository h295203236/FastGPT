import type { ChatCompletionMessageParam } from '@fastgpt/global/core/ai/type.d';
import { getAIApi } from '../config';
import { countGptMessagesTokens } from '../../../common/string/tiktoken/index';
import { loadRequestMessages } from '../../chat/utils';

export const Prompt_QuestionGuide = `你是一个能针对问题进一步提问的问题大师。请结合前面的对话记录，帮我生成 3 个问题，引导我继续提问，生成问题的语言要与原问题相同。问题的长度应小于20个字符，按 JSON 格式返回: ["问题1", "问题2", "问题3"]`;
export const Prompt_QuestionGuide2 = `你是一个能针对问题进一步提问的问题大师。帮我生成 3 个问题，引导我继续提问，生成问题的语言要与原问题相同。问题的长度应小于20个字符，按 JSON 格式返回: ["问题1", "问题2", "问题3"]`;

/**
 * 生成问题引导（猜你想问）
 */
export async function createQuestionGuide({
  messages,
  model,
  customPrompt,
  ignoreChatHistory = false
}: {
  messages: ChatCompletionMessageParam[];
  model: string;
  /** 自定义提示词 */
  customPrompt?: string;
  /** 忽略前面的对话内容 */
  ignoreChatHistory?: boolean;
}) {
  // 只保留用户的问题
  if (ignoreChatHistory) {
    messages = messages.filter((m) => m.role === 'user').slice(-1);
    if (!customPrompt) {
      customPrompt = Prompt_QuestionGuide2;
    }
  }
  if (!customPrompt) {
    customPrompt = Prompt_QuestionGuide;
  }
  const concatMessages: ChatCompletionMessageParam[] = [
    ...messages,
    {
      role: 'user',
      content: !!customPrompt ? customPrompt : Prompt_QuestionGuide
    }
  ];

  const ai = getAIApi({
    timeout: 480000
  });
  const data = await ai.chat.completions.create({
    model: model,
    temperature: 0.1,
    max_tokens: 200,
    messages: await loadRequestMessages({
      messages: concatMessages,
      useVision: false
    }),
    stream: false
  });

  const answer = data.choices?.[0]?.message?.content || '';

  const start = answer.indexOf('[');
  const end = answer.lastIndexOf(']');

  const tokens = await countGptMessagesTokens(concatMessages);

  if (start === -1 || end === -1) {
    return {
      result: [],
      tokens: 0
    };
  }

  const jsonStr = answer
    .substring(start, end + 1)
    .replace(/(\\n|\\)/g, '')
    .replace(/  /g, '');

  try {
    return {
      result: JSON.parse(jsonStr),
      tokens
    };
  } catch (error) {
    return {
      result: [],
      tokens: 0
    };
  }
}
