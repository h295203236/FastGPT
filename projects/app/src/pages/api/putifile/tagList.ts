import { NextAPI } from '@/service/middleware/entry';
import { listTags, PutifileTagItemResp } from './controller';
import { authJWT } from '@fastgpt/service/support/permission/controller';
import { NextApiRequest } from 'next';
import { DatasetTagType } from '@fastgpt/global/core/dataset/type';

/**
 * putifile 标签列表获取
 */
async function handler(req: NextApiRequest): Promise<DatasetTagType[]> {
  const { teamId, userId } = await authJWT(req.headers.authorization || '');
  const tags = await listTags({
    tenantId: teamId,
    userId: userId
  });
  return tags.map((tag: PutifileTagItemResp) => ({
    _id: tag.tagId,
    tag: tag.tagName
  }));
}

export default NextAPI(handler);
