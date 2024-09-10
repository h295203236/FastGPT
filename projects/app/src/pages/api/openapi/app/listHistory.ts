import { MongoApp } from '@fastgpt/service/core/app/schema';
import { AppListItemType } from '@fastgpt/global/core/app/type';
import { NextAPI } from '@/service/middleware/entry';
import { ApiRequestProps } from '@fastgpt/service/type/next';
import { ParentIdType } from '@fastgpt/global/common/parentFolder/type';
import { parseParentIdInMongo } from '@fastgpt/global/common/parentFolder/utils';
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
import { AppDefaultPermissionVal } from '@fastgpt/global/support/permission/app/constant';
import { replaceRegChars } from '@fastgpt/global/common/string/tools';
import { authOpenApiKey2 } from '@fastgpt/service/support/openapi/auth';
import { AppPermission } from '@fastgpt/global/support/permission/app/controller';
import { parseHeader } from '../tool';

export type ListAppBody = {
  parentFolder?: ParentIdType;
  type?: AppTypeEnum | AppTypeEnum[];
  searchKey?: string;
};

async function handler(req: ApiRequestProps<ListAppBody>): Promise<AppListItemType[]> {
  const { authorization: authToken, teamId, userId } = parseHeader(req.headers);
  const { tmbId } = await authOpenApiKey2({
    apikey: authToken || '',
    teamId: teamId || '',
    userId: userId || ''
  });

  let parentId = null;
  const { parentFolder, type, searchKey } = req.body;
  const getRecentlyChat = true;
  if (!!parentFolder) {
    const parentAppFolder = await MongoApp.findOne({ name: parentFolder, teamId }).lean();
    if (parentAppFolder) {
      parentId = String(parentAppFolder._id);
    } else {
      return [];
    }
  }

  // 构建查询条件
  const findAppsQuery = (() => {
    const searchMatch = searchKey
      ? {
          $or: [
            { name: { $regex: new RegExp(`${replaceRegChars(searchKey)}`, 'i') } },
            { intro: { $regex: new RegExp(`${replaceRegChars(searchKey)}`, 'i') } }
          ]
        }
      : {};

    if (getRecentlyChat) {
      return {
        // get all chat app
        teamId,
        type: { $in: [AppTypeEnum.workflow, AppTypeEnum.simple, AppTypeEnum.plugin] },
        ...searchMatch,
        ...parseParentIdInMongo(parentId)
      };
    }

    if (searchKey) {
      return {
        teamId,
        ...searchMatch
      };
    }

    return {
      teamId,
      ...(type && Array.isArray(type) && { type: { $in: type } }),
      ...(type && { type }),
      ...parseParentIdInMongo(parentId)
    };
  })();
  console.log('======findAppsQuery', findAppsQuery);
  // 查询应用及其权限
  const myApps = await MongoApp.find(
    findAppsQuery,
    '_id parentId avatar type name intro tmbId updateTime pluginData defaultPermission inheritPermission'
  )
    .sort({
      updateTime: -1
    })
    .limit(searchKey ? 20 : 1000)
    .lean();

  // 组装数据
  return myApps.slice(0, 15).map((app) => ({
    _id: app._id,
    tmbId: app.tmbId,
    avatar: app.avatar,
    type: app.type,
    name: app.name,
    intro: app.intro,
    updateTime: app.updateTime,
    permission: new AppPermission({
      per: app.defaultPermission,
      isOwner: String(app.tmbId) === String(tmbId)
    }),
    defaultPermission: app.defaultPermission || AppDefaultPermissionVal,
    pluginData: app.pluginData,
    inheritPermission: app.inheritPermission ?? true
  }));
}

export default NextAPI(handler);
