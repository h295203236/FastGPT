import { TrainingModeEnum, TrainingStatusEnum } from '@fastgpt/global/core/dataset/constants';
import type { CreateDatasetCollectionParams } from '@fastgpt/global/core/dataset/api.d';
import { MongoDatasetCollection } from './schema';
import {
  CollectionWithDatasetType,
  DatasetCollectionSchemaType
} from '@fastgpt/global/core/dataset/type';
import { MongoDatasetTraining } from '../training/schema';
import { MongoDatasetData } from '../data/schema';
import { delImgByRelatedId } from '../../../common/file/image/controller';
import { deleteDatasetDataVector } from '../../../common/vectorStore/controller';
import { delFileByFileIdList } from '../../../common/file/gridfs/controller';
import { BucketNameEnum } from '@fastgpt/global/common/file/constants';
import { ClientSession } from '../../../common/mongo';
import { createOrGetCollectionTags } from './utils';

export async function createOneCollection({
  teamId,
  tmbId,
  name,
  parentId,
  datasetId,
  type,

  trainingStatus = TrainingStatusEnum.success,
  trainingType = TrainingModeEnum.chunk,
  chunkSize = 512,
  chunkSplitter,
  qaPrompt,

  fileId,
  rawLink,

  externalFileId,
  externalFileUrl,

  // config
  config,

  hashRawText,
  rawTextLength,
  metadata = {},
  session,
  tags,
  ...props
}: CreateDatasetCollectionParams & {
  teamId: string;
  tmbId: string;
  [key: string]: any;
  session?: ClientSession;
}) {
  // 将父层级作为默认标签
  let newTags = tags || [];
  if (parentId) {
    const parent = await MongoDatasetCollection.findById(parentId);
    if (parent) {
      newTags.push(parent.name);
    }
  }
  newTags = Array.from(new Set(newTags));
  const collectionTags = await createOrGetCollectionTags({
    tags: newTags,
    teamId,
    datasetId,
    session
  });
  const [collection] = await MongoDatasetCollection.create(
    [
      {
        ...props,
        teamId,
        tmbId,
        parentId: parentId || null,
        datasetId,
        name,
        type,

        trainingStatus,
        trainingType,
        chunkSize,
        chunkSplitter,
        qaPrompt,

        fileId,
        rawLink,
        externalFileId,
        externalFileUrl,

        rawTextLength,
        hashRawText,
        metadata,
        tags: collectionTags,

        // config
        config
      }
    ],
    { session }
  );

  return collection;
}

/* delete collection related images/files */
export const delCollectionRelatedSource = async ({
  collections,
  session
}: {
  collections: (CollectionWithDatasetType | DatasetCollectionSchemaType)[];
  session: ClientSession;
}) => {
  if (collections.length === 0) return;

  const teamId = collections[0].teamId;

  if (!teamId) return Promise.reject('teamId is not exist');

  const fileIdList = collections.map((item) => item?.fileId || '').filter(Boolean);
  const relatedImageIds = collections
    .map((item) => item?.metadata?.relatedImgId || '')
    .filter(Boolean);

  // delete files
  await delFileByFileIdList({
    bucketName: BucketNameEnum.dataset,
    fileIdList
  });
  // delete images
  await delImgByRelatedId({
    teamId,
    relateIds: relatedImageIds,
    session
  });
};
/**
 * delete collection and it related data
 */
export async function delCollectionAndRelatedSources({
  collections,
  session
}: {
  collections: (CollectionWithDatasetType | DatasetCollectionSchemaType)[];
  session: ClientSession;
}) {
  if (collections.length === 0) return;

  const teamId = collections[0].teamId;

  if (!teamId) return Promise.reject('teamId is not exist');

  const datasetIds = Array.from(
    new Set(
      collections.map((item) => {
        if (typeof item.datasetId === 'string') {
          return String(item.datasetId);
        }
        return String(item.datasetId._id);
      })
    )
  );
  const collectionIds = collections.map((item) => String(item._id));

  // delete training data
  await MongoDatasetTraining.deleteMany({
    teamId,
    datasetIds: { $in: datasetIds },
    collectionId: { $in: collectionIds }
  });

  /* file and imgs */
  await delCollectionRelatedSource({ collections, session });

  // delete dataset.datas
  await MongoDatasetData.deleteMany(
    { teamId, datasetIds: { $in: datasetIds }, collectionId: { $in: collectionIds } },
    { session }
  );

  // delete collections
  await MongoDatasetCollection.deleteMany(
    {
      teamId,
      _id: { $in: collectionIds }
    },
    { session }
  );

  // no session delete: delete files, vector data
  await deleteDatasetDataVector({ teamId, datasetIds, collectionIds });
}
