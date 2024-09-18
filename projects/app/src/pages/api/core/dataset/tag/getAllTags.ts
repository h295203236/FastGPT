import type { NextApiRequest } from 'next';
import type { DatasetTagType } from '@fastgpt/global/core/dataset/type.d';
import { NextAPI } from '@/service/middleware/entry';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import { listTags } from '@/pages/api/putifile/controller';
import { idGenerate } from '@/pages/api/common/tools/idGenerate';
import { getNanoid } from '@fastgpt/global/common/string/tools';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';

/* get all dataset tags by datasetId */
async function handler(req: NextApiRequest): Promise<DatasetTagType[]> {
  const { teamId } = req.query;
  if (!teamId) {
    return [];
  }
  // 获取数据集已有标签
  const allDatasetTags =
    (await MongoDatasetCollectionTags.find({ datasetId: teamId }).lean()) || [];

  // 获取租户标签
  const allTenantTags: DatasetTagType[] = [];
  try {
    const dataset = await MongoDataset.findById(teamId).lean();
    const tenantTags = listTags({
      tenantId: String(BigInt(dataset?.teamId || '0')),
      userId: ''
    });
    if (tenantTags) {
      (await tenantTags).map((tag) => {
        allTenantTags.push({
          _id: getNanoid() || '',
          tag: tag.value
        });
      });
    }
  } catch (error) {
    console.error('get tags from system-service error', error);
  }

  const tags = allDatasetTags.map((tag) => ({
    _id: tag._id,
    tag: tag.tag
  }));

  // 合并租户标签
  allTenantTags.forEach((tag) => {
    if (!tags.find((t) => t.tag === tag.tag)) {
      tags.push(tag);
    }
  });
  // 按照tag名称排序
  tags.sort((a, b) => a.tag.localeCompare(b.tag));
  return tags;
}

export default NextAPI(handler);
