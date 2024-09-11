import { NextAPI } from '@/service/middleware/entry';
import { getFileUrl } from './controller';
import { NextApiRequest } from 'next';
import { getTokenFromCookie } from './tool';
import { authJWT } from '@fastgpt/service/support/permission/controller';

/**
 * putifile 临时文件访问地址获取
 */
async function handler(req: NextApiRequest): Promise<string> {
  const { fileId } = req.query;
  if (!fileId) {
    return Promise.reject('fileId is required');
  }

  const token = getTokenFromCookie(req.headers);
  if (!token) {
    throw new Error('token not found, cannot get the teamId');
  }
  const { teamId } = await authJWT(token);

  // 如果fileId是一个数组，取第一个
  const fileUrl = await getFileUrl(teamId, fileId as string);
  return fileUrl;
}

export default NextAPI(handler);
