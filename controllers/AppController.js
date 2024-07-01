import RedisClient from '../utils/redis';
import DBClient from '../utils/db';

export async function getStatus(req, res) {
  const dbStatus = DBClient.isAlive();
  const redisStatus = RedisClient.isAlive();

  return res.status(200).json({ redis: redisStatus, db: dbStatus });
}

export async function getStats(req, res) {
  const usersNo = await DBClient.nbUsers();
  const filesNo = await DBClient.nbFiles();

  return res.status(200).json({ users: usersNo, files: filesNo });
}
