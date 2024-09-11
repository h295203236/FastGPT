import { GET } from '@fastgpt/service/common/api/httpRequest';

const PUTI_URL: string = process.env.PUTI_URL || '';
const PUTI_KEY: string = process.env.PUTI_KEY || '';

type PutifileResp<T> = {
  code: number;
  msg: string;
  data: T;
};

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
 * 标签响应
 */
type PutifileTagItemResp = {
  id: string;
  tagId: string;
  tagName: string;
  tagValue: string;
};

type ListPutifileReq = {
  tenantId: string;
  folder: string;
  lastSyncTime: number;
};

/**
 * 获取标签列表请求
 */
type ListTagsReq = {
  tenantId: string;
  userId: string;
};

/**
 * 获取文件的临时访问地址
 */
async function getFileUrl(tenantId: string, fileId: string): Promise<string> {
  const fileResp = await GET<PutifileResp<string>>(
    `${PUTI_URL}/putifile/klg/file/${fileId}/temp-access-url`,
    {},
    { headers: { 'x-api-key': PUTI_KEY, tenantId: tenantId } }
  );
  return fileResp.data;
}

/**
 * 获取文件列表
 * @param params 请求参数
 * @returns 文件列表
 */
async function listChangedFiles(params: ListPutifileReq): Promise<PutifileFileItemResp[]> {
  const fileResp = await GET<PutifileResp<PutifileFileItemResp[]>>(
    `${PUTI_URL}/putifile/klg/file/changed`,
    {
      ...params
    },
    { headers: { 'x-api-key': PUTI_KEY, tenantId: params.tenantId } }
  );
  return fileResp.data;
}

/**
 * 获取标签列表
 * @param req 请求
 * @returns
 */
async function listTags(req: ListTagsReq): Promise<PutifileTagItemResp[]> {
  const re = await GET<PutifileResp<PutifileTagItemResp[]>>(
    `${PUTI_URL}/system/tag/list`,
    {
      keyword: ''
    },
    {
      headers: {
        'x-api-key': PUTI_KEY,
        'Content-Type': 'application/json',
        tenantId: req.tenantId,
        userId: '0'
      }
    }
  );
  return re.data;
}

// 导出上述变量
export { listChangedFiles, getFileUrl, listTags };
export type { PutifileResp, PutifileFileItemResp, PutifileTagItemResp, ListPutifileReq };
