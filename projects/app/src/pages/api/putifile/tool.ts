import { IncomingHttpHeaders } from 'http';

/**
 * 请求头中的token
 * @param headers 请求头
 */
export function getTokenFromCookie(headers: IncomingHttpHeaders) {
  const { cookie } = headers;
  console.log('====> cookie:', cookie);
  // 解析cookie中的 fast-token
  const token = cookie?.split(';').find((item) => item.includes('token='));
  if (!token) {
    return '';
  }
  return token.split('=')[1];
}
