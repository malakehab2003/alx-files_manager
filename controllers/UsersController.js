import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import RedisClient from '../utils/redis';

export async function getUserFromToken(header) {
  if (!header) {
    return null;
  }

  const key = `auth_${header}`;

  const userId = await RedisClient.get(key);

  if (!userId) {
    return null;
  }

  const user = await dbClient
    .client
    .db(dbClient.database)
    .collection('users')
    .findOne({
      _id: new ObjectId(userId),
    });

  if (!user) {
    return null;
  }

  return user;
}

export async function postNew(req, res) {
  const { email, password } = req.body;

  if (!email) {
    res.status(400).send({ error: 'Missing email' });
  }

  if (!password) {
    res.status(400).send({ error: 'Missing password' });
  }

  const user = await dbClient.client.db(dbClient.database).collection('users').findOne({ email });
  if (user) {
    res.status(400).send({ error: 'Already exist' });
  }

  const hashedPass = sha1(password);

  const result = await dbClient.client.db(dbClient.database).collection('users').insertOne({
    email,
    password: hashedPass,
  });

  return res.status(201).send({ id: result.insertedId, email });
}

export async function getMe(req, res) {
  const header = req.header('X-Token');

  const user = await getUserFromToken(header);

  if (!user) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  return res.send({ id: user._id, email: user.email });
}
