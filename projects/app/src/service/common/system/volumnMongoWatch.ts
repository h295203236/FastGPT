import { getSystemPlugins } from '@/service/core/app/plugin';
import { initSystemConfig } from '.';
import { createDatasetTrainingMongoWatch } from '@/service/core/dataset/training/utils';
import { MongoSystemConfigs } from '@fastgpt/service/common/system/config/schema';
import { MongoSystemPluginSchema } from '@fastgpt/service/core/app/plugin/systemPluginSchema';
import { createDatasetCollectionMongoWatch } from '@/service/core/dataset/training/putifileWatch';

export const startMongoWatch = async () => {
  reloadConfigWatch();
  refetchSystemPlugins();
  createDatasetTrainingMongoWatch();
  createDatasetCollectionMongoWatch();
};

const reloadConfigWatch = () => {
  const changeStream = MongoSystemConfigs.watch();

  changeStream.on('change', async (change) => {
    try {
      if (change.operationType === 'insert') {
        await initSystemConfig();
        console.log('refresh system config');
      }
    } catch (error) {}
  });
};

const refetchSystemPlugins = () => {
  const changeStream = MongoSystemPluginSchema.watch();

  changeStream.on('change', async (change) => {
    setTimeout(() => {
      try {
        getSystemPlugins(true);
      } catch (error) {}
    }, 5000);
  });
};
