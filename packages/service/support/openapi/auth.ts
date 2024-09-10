import { ERROR_ENUM } from '@fastgpt/global/common/error/errorCode';
import { updateApiKeyUsedTime } from './tools';
import { MongoOpenApi } from './schema';
import { POST } from '../../common/api/plusRequest';
import type { OpenApiSchema } from '@fastgpt/global/support/openapi/type';
import { MongoTeamMember } from '../user/team/teamMemberSchema';

export type AuthOpenApiLimitProps = { openApi: OpenApiSchema };

export async function authOpenApiKey({ apikey }: { apikey: string }) {
  if (!apikey) {
    return Promise.reject(ERROR_ENUM.unAuthApiKey);
  }
  try {
    const openApi = await MongoOpenApi.findOne({ apiKey: apikey.trim() });
    if (!openApi) {
      return Promise.reject(ERROR_ENUM.unAuthApiKey);
    }

    // auth limit
    // @ts-ignore
    if (global.feConfigs?.isPlus) {
      await POST('/support/openapi/authLimit', {
        openApi: openApi.toObject()
      } as AuthOpenApiLimitProps);
    }

    updateApiKeyUsedTime(openApi._id);

    return {
      apikey,
      teamId: String(openApi.teamId),
      tmbId: String(openApi.tmbId),
      appId: openApi.appId || ''
    };
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * 验证openApi key
 */
export async function authOpenApiKey2({
  apikey,
  teamId,
  userId
}: {
  apikey: string;
  teamId: string;
  userId: string;
}) {
  if (!teamId || !userId) {
    return Promise.reject("teamId or userId can't be empty");
  }
  if (!apikey) {
    return Promise.reject(ERROR_ENUM.unAuthApiKey);
  }
  try {
    const openApi = await MongoOpenApi.findOne({ apiKey: apikey.trim() });
    if (!openApi || String(openApi.teamId) !== teamId) {
      return Promise.reject(ERROR_ENUM.unAuthApiKey);
    }
    // 获取tmbId
    const member = await MongoTeamMember.findOne({ teamId, userId });
    if (!member) {
      return Promise.reject(ERROR_ENUM.unAuthorization);
    }

    updateApiKeyUsedTime(openApi._id);

    return {
      apikey,
      teamId: String(openApi.teamId),
      tmbId: String(member._id),
      appId: openApi.appId || ''
    };
  } catch (error) {
    return Promise.reject(error);
  }
}
