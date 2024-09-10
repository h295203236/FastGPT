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
  parentIdFolder?: ParentIdType;
  type?: AppTypeEnum | AppTypeEnum[];
  searchKey?: string;
};

/**
 * 获取应用列表接口
 * @param req 请求
 */
async function handler(req: ApiRequestProps<ListAppBody>): Promise<AppListItemType[]> {
  const { authorization: authToken, teamId, userId } = parseHeader(req.headers);
  const { tmbId } = await authOpenApiKey2({
    apikey: authToken || '',
    teamId: teamId || '',
    userId: userId || ''
  });

  let parentId = null;
  const { parentIdFolder, type, searchKey } = req.body;
  if (!!parentIdFolder) {
    const parentAppFolder = await MongoApp.findOne({ name: parentIdFolder, teamId }).lean();
    if (parentAppFolder) {
      parentId = parentAppFolder._id;
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
  return myApps.map((app) => ({
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
