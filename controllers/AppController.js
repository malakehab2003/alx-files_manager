import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export async function getStatus(req, res) {
  const db_status = dbClient.isAlive();
  const redis_status = redisClient.isAlive();

  return res.status(200).json({ "redis": redis_status, "db": db_status });
}

export async function getStats(req, res) {
  const files_no = await dbClient.nbUsers();
  const users_no = await dbClient.nbFiles();

  return res.status(200).json({ "users": users_no, "files": files_no });
}
