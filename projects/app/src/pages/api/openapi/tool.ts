import { IncomingHttpHeaders } from 'http';
import { idGenerate } from '../common/tools/idGenerate';

/**
 * 请求头参数解析
 * @param headers 请求头
 */
export function parseHeader(headers: IncomingHttpHeaders) {
  const { authorization, teamid: teamId, userid: userId } = headers;
  return {
    authorization,
    teamId: idGenerate(teamId as string),
    userId: idGenerate(userId as string)
  };
}
