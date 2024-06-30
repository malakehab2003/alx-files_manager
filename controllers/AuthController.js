import sha1 from 'sha1';
import dbClient from '../utils/db'
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis'

export async function getConnect(req, res) {
  let header = req.header('Authorization');

  // check to get authorization from the header
  if (!header) {
    return res.status(401).send({error: 'Unauthorized'});
  }

  // check find Basic in header
  if (header.slice(0, 6) !== 'Basic ') {
    return res.status(401).send({error: 'Unauthorized'});
  }

  // removing the Basic  to get the hashed email and password
  header = header.replace('Basic ', '');

  let decodedHeader = Buffer.from(header, 'base64');
  decodedHeader = decodedHeader.toString('utf-8');

  // split the stirng to get the password and the email
  const arr = decodedHeader.split(':');

  const email = arr[0];
  const password = arr[1];

  if (!email || !password) {
    return res.status(401).send({error: 'Unauthorized'});
  }

  // hash password
  const hashed_pass = sha1(password);

  // search for user in mongodb
  const user = await dbClient
    .client.db(dbClient.database)
    .collection('users')
    .findOne({
      'email': email,
      'password': hashed_pass
    });

  // return error if no user
  if (!user) {
    return res.status(401).send({error: 'Unauthorized'});
  }

  // generate unique token and set it as cashe
  const token = uuidv4();
  const key = `auth_${token}`;
  const value = user._id.toString();
  await redisClient.set(key, value, 86400);

  // return the generated token
  return res.status(200).send({'token': token});
}

export async function getDisconnect(req, res) {
  const header = req.header('X-Token');

  if (!header) {
    return res.status(401).send({error: 'Unauthorized'});
  }

  const key = `auth_${header}`;
  const redis = await redisClient.get(key);

  if (!redis) {
    return res.status(401).send({error: 'Unauthorized'});
  }

  await redisClient.del(key);
  return res.status(204).send();
}
