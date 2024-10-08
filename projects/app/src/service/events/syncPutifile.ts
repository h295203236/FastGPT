import { listChangedFiles } from '@/pages/api/putifile/controller';
import {
  DatasetCollectionTypeEnum,
  TrainingModeEnum,
  TrainingStatusEnum
} from '@fastgpt/global/core/dataset/constants';
import { createOneCollection } from '@fastgpt/service/core/dataset/collection/controller';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';

// 定期同步putifile文件
export const syncPutifileJob = async () => {
  console.log('开始同步putifile任务.');
  // 获取所有putifile同步任务
  const putifileTasks = await MongoDatasetCollection.find({
    type: DatasetCollectionTypeEnum.putiFile,
    forbid: false
  });
  // 遍历同步任务
  for (const task of putifileTasks) {
    // 处理失败任务，先删除后重建
    if (task.trainingStatus === TrainingStatusEnum.failed) {
      const failedChildren = await MongoDatasetCollection.find({
        parentId: task._id,
        trainingStatus: TrainingStatusEnum.failed,
        forbid: false
      });
      for (const failedChild of failedChildren) {
        if (failedChild.__v > 3) {
          await MongoDatasetCollection.updateOne(
            {
              _id: failedChild._id
            },
            {
              $set: {
                forbid: true
              }
            }
          );
        } else {
          await MongoDatasetCollection.deleteOne({ _id: failedChild._id });
          await createOneCollection({
            ...failedChild,
            _v: (failedChild.__v || 1) + 1
          });
        }
      }
    }

    if (task.config?.policy !== 'sync_folder') {
      continue;
    }
    console.log('开始同步putifile任务:', task._id, task.name);
    try {
      // 检查任务下是否有正在处理的任务
      const processing = await MongoDatasetCollection.findOne({
        parentId: task._id,
        trainingStatus: TrainingStatusEnum.pending
      });
      if (processing) {
        continue;
      }
      // 获取putifile文件列表
      console.debug('putifile任务:{}获取参数:{}', task._id, {
        tenantId: task.teamId,
        folder: task.config?.folder,
        lastSyncTime: task.config?.lastSyncTime || 0
      });
      const files = await listChangedFiles({
        tenantId: task.teamId,
        folder: task.config?.folder,
        lastSyncTime: task.config?.lastSyncTime || 0
      });
      if (!files || files.length === 0) {
        console.log('putifile任务:{}没有新文件.', task._id);
        continue;
      }
      // 遍历文件列表，创建新的任务
      for (const file of files) {
        // 先将旧任务标记为禁用
        await MongoDatasetCollection.updateMany(
          {
            datasetId: task.datasetId,
            externalFileId: file.id
          },
          {
            $set: {
              forbid: true
            }
          }
        );

        // 创建新任务，并提升版本号
        await createOneCollection({
          datasetId: task.datasetId,
          parentId: task._id,
          teamId: task.teamId,
          tmbId: task.tmbId,
          type: DatasetCollectionTypeEnum.externalFile,
          name: file.fileName,
          trainingType: task.trainingType,
          chunkSize: task.chunkSize,
          chunkSplitter: task.chunkSplitter,
          qaPrompt: task.qaPrompt,
          externalFileId: file.id,
          trainingStatus: TrainingStatusEnum.pending,
          forbid: false,
          tags: file.tags
        });
        // 优化：如果是qa模式，直接创建一个chunk
        if (task.trainingType === TrainingModeEnum.qa) {
          await createOneCollection({
            datasetId: task.datasetId,
            parentId: task._id,
            teamId: task.teamId,
            tmbId: task.tmbId,
            type: DatasetCollectionTypeEnum.externalFile,
            name: file.fileName,
            trainingType: TrainingModeEnum.chunk,
            chunkSize: task.chunkSize || 4000,
            chunkSplitter: task.chunkSplitter,
            qaPrompt: task.qaPrompt,
            externalFileId: file.id,
            trainingStatus: TrainingStatusEnum.pending,
            forbid: false,
            tags: file.tags
          });
        }
      }

      // 更新同步时间
      const maxTime = Math.max(...files.map((item) => item.updatedTime || 0));
      if (maxTime > 0) {
        await MongoDatasetCollection.updateOne(
          {
            _id: task._id
          },
          {
            $set: {
              'config.lastSyncTime': maxTime
            }
          }
        );
      }
    } catch (error) {
      console.error('同步putifile 任务:{}失败.详情:', task, error);
    }
  }
};
