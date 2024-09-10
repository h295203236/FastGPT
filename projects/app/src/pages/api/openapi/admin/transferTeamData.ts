import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { ApiRequestProps } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { getTeam } from '../team/controller';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import { MongoDatasetData } from '@fastgpt/service/core/dataset/data/schema';
import { MongoApp } from '@fastgpt/service/core/app/schema';
import { MongoAppVersion } from '@fastgpt/service/core/app/version/schema';
import { MongoChat } from '@fastgpt/service/core/chat/chatSchema';
import { MongoChatItem } from '@fastgpt/service/core/chat/chatItemSchema';
import { getUser } from '../user/controller';
import { MongoOpenApi } from '@fastgpt/service/support/openapi/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { MongoImage } from '@fastgpt/service/common/file/image/schema';

type TransferTreamDataBody = {
  olderTeamId: string;
  newTeamId: string;
  newUserId?: string;
};

/**
 * 创建用户
 * @param req 请求
 */
async function handler(req: ApiRequestProps<TransferTreamDataBody>): Promise<boolean> {
  const body = req.body as TransferTreamDataBody;
  const olderTeam = await getTeam(body.olderTeamId);
  if (!olderTeam) {
    return Promise.reject('该租户{}不存在'.replace('{}', body.olderTeamId));
  }
  const newTeam = await getTeam(body.newTeamId);
  if (!newTeam) {
    return Promise.reject('该租户{}不存在'.replace('{}', body.newTeamId));
  }
  let newUser = null;
  if (body.newUserId) {
    newUser = await getUser(body.newUserId);
    if (!newUser) {
      return Promise.reject('该用户{}不存在'.replace('{}', body.newUserId));
    }
  }

  // 转移数据
  const olderTeamIdF = olderTeam._id;
  const newTeamIdF = newTeam._id;
  const newUserIdF = newUser ? newUser._id : newTeam.ownerId;

  const member = await MongoTeamMember.findOne({ teamId: newTeamIdF, userId: newUserIdF }).lean();
  if (!member) {
    return Promise.reject(
      '该用户{}不在租户{}中'.replace('{}', newUserIdF).replace('{}', newTeamIdF)
    );
  }
  const memberId = member._id;

  await mongoSessionRun(async (session) => {
    // 转移数据
    // 迁移知识库相关数据
    await MongoDataset.updateMany(
      { teamId: olderTeamIdF },
      { $set: { teamId: newTeamIdF, tmbId: memberId } },
      { session }
    );
    await MongoDatasetCollection.updateMany(
      { teamId: olderTeamIdF },
      { $set: { teamId: newTeamIdF, tmbId: memberId } },
      { session }
    );
    await MongoDatasetCollectionTags.updateMany(
      { teamId: olderTeamIdF },
      { $set: { teamId: newTeamIdF, tmbId: memberId } },
      { session }
    );
    await MongoDatasetData.updateMany(
      { teamId: olderTeamIdF },
      { $set: { teamId: newTeamIdF, tmbId: memberId } },
      { session }
    );
    await MongoImage.updateMany(
      { teamId: olderTeamIdF },
      { $set: { teamId: newTeamIdF } },
      { session }
    );

    // 迁移应用相关数据
    await MongoApp.updateMany(
      { teamId: olderTeamIdF },
      { $set: { teamId: newTeamIdF, tmbId: memberId } },
      { session }
    );
    await MongoAppVersion.updateMany(
      { teamId: olderTeamIdF },
      { $set: { teamId: newTeamIdF, tmbId: memberId } },
      { session }
    );

    // 迁移用户相关数据
    await MongoChat.updateMany(
      { teamId: olderTeamIdF },
      { $set: { teamId: newTeamIdF, tmbId: memberId } },
      { session }
    );
    await MongoChatItem.updateMany(
      { teamId: olderTeamIdF },
      { $set: { teamId: newTeamIdF, tmbId: memberId } },
      { session }
    );

    // 迁移对外访问token
    await MongoOpenApi.updateMany(
      { teamId: olderTeamIdF },
      { $set: { teamId: newTeamIdF, tmbId: memberId } },
      { session }
    );
  });

  return true;
}

export default NextAPI(handler);
