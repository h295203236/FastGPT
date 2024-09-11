import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { ApiRequestProps } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { idGenerate } from '../../common/tools/idGenerate';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import { MongoDatasetData } from '@fastgpt/service/core/dataset/data/schema';
import { MongoImage } from '@fastgpt/service/common/file/image/schema';

type TransferDatsetDataBody = {
  olderDatasetId: string;
  newDatasetId: string;
  newParentId?: string;
};

/**
 * 迁移知识库数据
 * @param req 请求
 */
async function handler(req: ApiRequestProps<TransferDatsetDataBody>): Promise<boolean> {
  const body = req.body as TransferDatsetDataBody;
  const olderDatasetIdF = idGenerate(body.olderDatasetId);
  const olderDataset = await MongoDataset.findById(olderDatasetIdF).lean();
  if (!olderDataset) {
    return Promise.reject('该知识库{}不存在'.replace('{}', body.olderDatasetId));
  }
  const newDatasetIdF = idGenerate(body.newDatasetId);
  const newDataset = await MongoDataset.findById(newDatasetIdF).lean();
  if (!newDataset) {
    return Promise.reject('该知识库{}不存在'.replace('{}', body.newDatasetId));
  }

  // 转移数据
  await mongoSessionRun(async (session) => {
    await MongoDatasetCollection.updateMany(
      { datasetId: olderDatasetIdF },
      { $set: { datasetId: newDatasetIdF } },
      { session }
    );
    await MongoDatasetCollectionTags.updateMany(
      { datasetId: olderDatasetIdF },
      { $set: { datasetId: newDatasetIdF } },
      { session }
    );
    await MongoDatasetData.updateMany(
      { datasetId: olderDatasetIdF },
      { $set: { datasetId: newDatasetIdF } },
      { session }
    );
    await MongoImage.updateMany(
      { datasetId: olderDatasetIdF },
      { $set: { datasetId: newDatasetIdF } },
      { session }
    );
  });

  return true;
}

export default NextAPI(handler);
