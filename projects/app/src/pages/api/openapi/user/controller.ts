import { CreateUserParams, UpdateUserParams } from '@/global/core/user/api';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { ClientSession } from 'mongoose';
import { idGenerate } from '../../common/tools/idGenerate';
import { UserStatusEnum } from '@fastgpt/global/support/user/constant';
import { has } from 'lodash';
import { hashStr } from '@fastgpt/global/common/string/tools';

/**
 * 创建用户
 */
export async function createUser({
  userId,
  status,
  username,
  password,
  avatar,
  timezone,
  createTime,
  session: ClientSession
}: CreateUserParams & { session: ClientSession }) {
  const userIdF = idGenerate(userId);
  const existUser = await MongoUser.findOne({ _id: userIdF });
  if (existUser) {
    return existUser._id;
  }
  await MongoUser.create({
    _id: userIdF,
    status: status || UserStatusEnum.active,
    username,
    password: hashStr(password),
    avatar: avatar || '/icon/human.svg',
    timezone: timezone || 'Asia/Shanghai',
    createTime: createTime || new Date()
  });
  return userIdF;
}

/**
 * 更新用户
 */
export async function updateUser({
  userId,
  status,
  username,
  password,
  avatar,
  timezone,
  session
}: UpdateUserParams & { session: ClientSession }) {
  const userIdF = idGenerate(userId);
  await MongoUser.findByIdAndUpdate(
    userIdF,
    {
      status,
      username,
      password,
      avatar,
      timezone
    },
    { session }
  );
  return userIdF;
}

/**
 * 获取用户
 */
export async function getUser(userId: string) {
  const userIdF = idGenerate(userId);
  return await MongoUser.findById(userIdF);
}

/**
 * 删除用户
 */
export async function deleteUser(userId: string) {
  const userIdF = idGenerate(userId);
  await MongoUser.findByIdAndDelete(userIdF);
  return true;
}

/**
 * 更改用户状态
 */
export async function changeUserStatus(userId: string, status: string) {
  const userIdF = idGenerate(userId);
  await MongoUser.findByIdAndUpdate(userIdF, { status });
  return true;
}
