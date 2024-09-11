import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import { DatasetTagType } from '@fastgpt/global/core/dataset/type';
import { idGenerate } from '@/pages/api/common/tools/idGenerate';

type CreateCollectionTagParams = {
  teamId: string;
  datasetId: string;
  tags: DatasetTagType[];
};

/* 设置数据集合标签 */
async function handler(req: NextApiRequest): Promise<void> {
  const { teamId, datasetId, tags } = req.body as CreateCollectionTagParams;
  // 根据id判断是否已经存在，如果不存在则创建
  const teamidF = idGenerate(teamId);
  const datasetidF = idGenerate(datasetId);
  for (const tag of tags) {
    const idF = idGenerate(tag._id);
    const existTag = await MongoDatasetCollectionTags.findById(idF).lean();
    if (!existTag) {
      await MongoDatasetCollectionTags.create({
        teamId: teamidF,
        datasetId: datasetidF,
        tag: tag.tag,
        _id: idF
      });
    } else {
      await MongoDatasetCollectionTags.findByIdAndUpdate(idF, {
        tag: tag.tag
      });
    }
  }
}

export default NextAPI(handler);
