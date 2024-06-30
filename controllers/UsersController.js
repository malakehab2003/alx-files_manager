import dbClient from '../utils/db'
import sha1 from 'sha1';
import redisClient from '../utils/redis';
import { ObjectId } from 'mongodb';

export async function postNew(req, res) {
  const { email, password } = req.body;

  if (!email) {
    res.status(400).send({ "error": 'Missing email' });
  }

  if (!password) {
    res.status(400).send({"error":"Missing password"});
  }

  const user = await dbClient.client.db(dbClient.database).collection('users').findOne({ 'email': email });
  if (user) {
    res.status(400).send({"error":"Already exist"})
  }

  const hashed_pass = sha1(password);

  const result = await dbClient.client.db(dbClient.database).collection('users').insertOne({
    'email': email,
    'password': hashed_pass
  });

  return res.status(201).send({'id': result.insertedId, 'email': email});
}

export async function getMe(req, res) {
  const header = req.header('X-Token');

  const user = await getUserFromToken(header)

  if (!user) {
    return res.status(401).send({error: 'Unauthorized'});
  }
  
  return res.send({'id': user._id, 'email': user.email});
}

export async function getUserFromToken(header) {
  if (!header) {
    return null;
  }

  const key = `auth_${header}`;

  const user_id = await redisClient.get(key);

  if (!user_id) {
    return null;
  }

  const user = await dbClient
    .client
    .db(dbClient.database)
    .collection('users')
    .findOne({
      '_id': new ObjectId(user_id)
    });

    if (!user) {
      return null;
    }

    return user
}
