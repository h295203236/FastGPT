import { NextAPI } from '@/service/middleware/entry';
import { listTags, PutifileTagItemResp } from './controller';

/**
 * putifile 标签列表获取
 */
async function handler(): Promise<PutifileTagItemResp[]> {
  const tags = await listTags();
  return tags;
}

export default NextAPI(handler);
