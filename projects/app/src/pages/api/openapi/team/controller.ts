import { CreateTeamParams, UpdateTeamParams } from '@/global/core/team/api';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { ClientSession, Types } from 'mongoose';
import { idGenerate } from '../../common/tools/idGenerate';
import { TeamMemberRoleEnum } from '@fastgpt/global/support/user/team/constant';
import { MongoUser } from '@fastgpt/service/support/user/schema';

// 创建租户
export async function createTeam({
  id,
  ownerId,
  name,
  avatar,
  balance,
  session
}: CreateTeamParams & { session: ClientSession }) {
  const idF = idGenerate(id);
  const ownerF = idGenerate(ownerId);
  if (!!id) {
    const existTeam = await MongoTeam.findById(idF);
    if (!existTeam) {
      await MongoTeam.create(
        [
          {
            _id: idF,
            ownerId: ownerF,
            name,
            avatar,
            balance,
            createTime: new Date()
          }
        ],
        { session }
      );
    } else {
      updateTeam({
        id,
        name,
        avatar,
        balance,
        session
      });
    }
  } else {
    await MongoTeam.create(
      [
        {
          _id: idF,
          ownerId: ownerF,
          name,
          avatar,
          balance,
          createTime: new Date()
        }
      ],
      { session }
    );
  }
  return idF;
}

/**
 * 更新租户
 */
export async function updateTeam({
  id,
  name,
  avatar,
  balance,
  session
}: UpdateTeamParams & { session: ClientSession }) {
  const idF = idGenerate(id);
  await MongoTeam.findByIdAndUpdate(
    idF,
    {
      name,
      avatar,
      balance
    },
    { session }
  );
}

/**
 * 获取租户
 */
export async function getTeam(id: string) {
  const idF = idGenerate(id);
  return await MongoTeam.findById(idF);
}

/**
 * 设置租户拥有者
 */
export async function setTeamOwner({
  teamId,
  ownerId,
  session
}: {
  teamId: string;
  ownerId: string;
} & { session: ClientSession }) {
  const teamIdF = idGenerate(teamId);
  const ownerIdF = idGenerate(ownerId);
  const user = await MongoUser.findById(ownerIdF).session(session);
  if (!user) {
    return Promise.reject('该用户不存在');
  }
  const team = await MongoTeam.findById(teamIdF).session(session);
  if (!team) {
    return Promise.reject('该租户不存在');
  }

  const member = await MongoTeamMember.findOne({
    teamId: idGenerate(teamId),
    userId: idGenerate(ownerId)
  }).session(session);
  if (!member) {
    // 加入租户
    await addUserToTeam({
      teamId: teamId,
      userId: ownerId,
      name: user.username,
      role: TeamMemberRoleEnum.owner,
      status: 'active',
      defaultTeam: false,
      session
    });
  } else {
    // 设置租户成员为拥有者角色
    await MongoTeamMember.updateOne(
      { teamId: teamIdF, userId: ownerIdF },
      {
        role: TeamMemberRoleEnum.owner
      },
      { session }
    );
  }

  // 设置租户拥有者
  await MongoTeam.findByIdAndUpdate(
    teamIdF,
    {
      ownerId: ownerIdF
    },
    { session }
  );
  return true;
}

/**
 * 加入租户
 */
export async function addUserToTeam({
  id,
  teamId,
  userId,
  name,
  role,
  status,
  defaultTeam,
  session
}: {
  id?: string;
  teamId: string;
  userId: string;
  name: string;
  role: string;
  status: string;
  defaultTeam: boolean;
} & { session: ClientSession }) {
  const teamIdF = idGenerate(teamId);
  const userIdF = idGenerate(userId);
  const tmb = await MongoTeamMember.findOne({ teamId: teamIdF, userId: userIdF }).session(session);
  if (tmb) {
    return false;
  }
  await MongoTeamMember.create(
    [
      {
        _id: !!id ? idGenerate(id) : new Types.ObjectId(),
        teamId: teamIdF,
        userId: userIdF,
        name,
        role,
        status: status || 'active',
        defaultTeam,
        createTime: new Date()
      }
    ],
    { session }
  );
  return true;
}
