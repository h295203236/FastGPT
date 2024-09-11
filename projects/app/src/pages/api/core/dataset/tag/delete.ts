import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import { idGenerate } from '@/pages/api/common/tools/idGenerate';

type DeleteCollectionTagParams = {
  tags: string[];
};

/* 删除标签 */
async function handler(req: NextApiRequest): Promise<void> {
  const { tags } = req.body as DeleteCollectionTagParams;
  for (const tag of tags) {
    const idF = idGenerate(tag);
    await MongoDatasetCollectionTags.findByIdAndDelete(idF);
  }
}

export default NextAPI(handler);
