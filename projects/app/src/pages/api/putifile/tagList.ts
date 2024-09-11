import { NextAPI } from '@/service/middleware/entry';
import { listTags, PutifileTagItemResp } from './controller';
import { authJWT } from '@fastgpt/service/support/permission/controller';
import { NextApiRequest } from 'next';
import { DatasetTagType } from '@fastgpt/global/core/dataset/type';
import { getTokenFromCookie } from './tool';

/**
 * putifile 标签列表获取
 */
async function handler(req: NextApiRequest): Promise<DatasetTagType[]> {
  const token = getTokenFromCookie(req.headers);
  if (!token) {
    throw new Error('token not found, cannot get the teamId');
  }
  const { teamId } = await authJWT(token);

  const tags = await listTags({
    tenantId: teamId,
    userId: '0'
  });
  return tags.map((tag: PutifileTagItemResp) => ({
    _id: tag.tagId,
    tag: tag.tagName
  }));
}

export default NextAPI(handler);
