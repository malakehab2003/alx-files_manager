import RedisClient from '../utils/redis';
import DBClient from '../utils/db';

export async function getStatus(req, res) {
  const dbStatus = await DBClient.isAlive();
  const redisStatus = await RedisClient.isAlive();

  return res.status(200).json({ redis: redisStatus, db: dbStatus });
}

export async function getStats(req, res) {
  const filesNo = await DBClient.nbUsers();
  const usersNo = await DBClient.nbFiles();

  return res.status(200).json({ users: usersNo, files: filesNo });
}
