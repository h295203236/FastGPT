import { NextAPI } from '@/service/middleware/entry';
import { listChangedFiles } from './controller';
import { NextApiRequest } from 'next';
import { authJWT } from '@fastgpt/service/support/permission/controller';
import { getTokenFromCookie } from './tool';

type PutifileFileItemResp = {
  /** 文件ID */
  id: string;
  /** 文件名 */
  fileName: string;
  /** 文件大小 */
  fileSize?: number;
  /** 文件标签列表 */
  tags?: string[];
  /** 文件创建时间 */
  createdTime?: number;
  /** 文件更新时间 */
  updatedTime?: number;
};

/**
 * 获取指定文件夹下的文件列表
 */
async function handler(req: NextApiRequest): Promise<PutifileFileItemResp[]> {
  const { folder } = req.body as {
    folder: string;
  };

  if (!folder) {
    return Promise.reject('folder is required');
  }

  // 获取token
  const token = getTokenFromCookie(req.headers);
  if (!token) {
    throw new Error('token not found, cannot get the teamId');
  }
  const { teamId } = await authJWT(token);

  // 获取文件列表
  return await listChangedFiles({ tenantId: teamId, folder, lastSyncTime: 0 });
}

export default NextAPI(handler);
