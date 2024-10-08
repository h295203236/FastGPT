import { NextAPI } from '@/service/middleware/entry';
import { ApiRequestProps } from '@fastgpt/service/type/next';
import { PutifileFileReCreateDatasetCollectionParams } from '@fastgpt/global/core/dataset/api';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';
import {
  createOneCollection,
  delCollectionAndRelatedSources
} from '@fastgpt/service/core/dataset/collection/controller';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import {
  DatasetCollectionTypeEnum,
  TrainingModeEnum,
  TrainingStatusEnum
} from '@fastgpt/global/core/dataset/constants';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';

/**
 * putifile 重建数据集合
 */
async function handler(
  req: ApiRequestProps<PutifileFileReCreateDatasetCollectionParams>
): Promise<string> {
  const params = req.body as PutifileFileReCreateDatasetCollectionParams;
  console.log('putifile 重建数据集合:', params);
  if (!params.datasetId || !params.externalFileId || !params.externalFileUrl || !params.filename) {
    return Promise.reject(
      'datasetId and externalFileId and externalFileUrl and filename are required'
    );
  }

  // 获取团队ID和TMB ID
  const dataset = await MongoDataset.findOne({ _id: params.datasetId })
    .select('teamId tmbId')
    .lean();
  if (!dataset) {
    return Promise.reject('dataset not found');
  }

  // 创建集合标签
  let collectionTags: any[] = [];
  if (params.tags && Array.from(new Set(params.tags)).length > 0) {
    // 遍历标签，然后获取，如果没有找到则创建
    for (const tagName of Array.from(new Set(params.tags))) {
      if (!tagName) {
        continue;
      }
      const tag = await MongoDatasetCollectionTags.findOne({ tag: tagName });
      if (!tag) {
        collectionTags.push(
          await MongoDatasetCollectionTags.create({
            teamId: dataset.teamId,
            datasetId: dataset._id,
            tag: tagName
          })
        );
      } else {
        collectionTags.push(tag);
      }
    }
  }

  // 重建数据集合
  await mongoSessionRun(async (session) => {
    // 删除原有数据集合
    if (params.id) {
      const collections = await MongoDatasetCollection.find({ fileId: params.id }).session(session);
      if (collections && collections.length > 0) {
        // 删除原有数据集合
        await delCollectionAndRelatedSources({ collections, session });
      }
    }

    //console.log('putifile 重建数据集合:', collection);
    // 创建数据集合
    const { _id: collectionId } = await createOneCollection({
      teamId: dataset.teamId,
      tmbId: dataset.tmbId,
      datasetId: params.datasetId,
      parentId: params.parentId,
      type: DatasetCollectionTypeEnum.externalFile,
      name: params.filename || '',
      forbid: false,
      tags: params.tags,

      // special metadata
      trainingStatus: TrainingStatusEnum.pending,
      trainingType: params.trainingType || TrainingModeEnum.chunk,
      chunkSize: params.chunkSize || 4000,
      chunkSplitter: params.chunkSplitter,
      qaPrompt: params.qaPrompt,

      externalFileId: params.externalFileId,
      externalFileUrl: params.externalFileUrl,

      hashRawText: undefined,
      rawTextLength: undefined,

      createTime: new Date(),
      updateTime: new Date(),

      session
    });
    // 如果时qa模式，做一个优化，在创建一个直接拆分的chunk
    if (params.trainingType === TrainingModeEnum.qa) {
      await createOneCollection({
        teamId: dataset.teamId,
        tmbId: dataset.tmbId,
        datasetId: params.datasetId,
        parentId: params.parentId,
        type: DatasetCollectionTypeEnum.externalFile,
        name: params.filename || '',
        forbid: false,
        tags: params.tags,

        // special metadata
        trainingStatus: TrainingStatusEnum.pending,
        trainingType: TrainingModeEnum.chunk,
        chunkSize: params.chunkSize || 4000,
        chunkSplitter: params.chunkSplitter,
        qaPrompt: params.qaPrompt,

        externalFileId: params.externalFileId,
        externalFileUrl: params.externalFileUrl,

        hashRawText: undefined,
        rawTextLength: undefined,

        createTime: new Date(),
        updateTime: new Date(),

        session
      });
    }
    return collectionId;
  });

  return '';
}

export default NextAPI(handler);
