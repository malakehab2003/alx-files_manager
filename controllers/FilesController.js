import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import { getUserFromHeader } from './UsersController';
import dbClient from '../utils/db';

export async function getParentId(req, res) {
  const parentId = req.body.parentId || 0;

  if (parentId !== 0) {
    const parentFile = await dbClient
      .files
      .findOne({
        _id: new ObjectId(parentId),
      });

    if (!parentFile) {
      return res.status(400).send({ error: 'Parent not found' });
    }

    if (parentFile.type !== 'folder') {
      return res.status(400).send({ error: 'Parent is not a folder' });
    }
  }

  return parentId;
}

export async function postUpload(req, res) {
  // get the token from the header
  const user = await getUserFromHeader(req);
  if (!user) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  // get the filename from body and check if not null
  const filename = req.body.name;

  if (!filename) {
    return res.status(400).send({ error: 'Missing name' });
  }

  // get the type from the body
  // check if not null
  // if not in acceptedType
  const acceptedType = ['folder', 'file', 'image'];

  const { type } = req.body;

  if (!type || !acceptedType.includes(type)) {
    return res.status(400).send({ error: 'Missing type' });
  }

  // get data and check if not null
  const { data } = req.body;

  if (!data && type !== 'folder') {
    return res.status(400).send({ error: 'Missing data' });
  }

  // get the parent id if set
  // if set check if the parent file exists
  // if not set make it equal to zero
  const parentId = await getParentId(req, res);

  // get is public from body set it to false as default
  const isPublic = req.body.isPublic || false;

  // get the user id
  const userId = user._id;

  // if type is folder return it
  if (type === 'folder') {
    const result = await dbClient
      .files
      .insertOne({
        userId,
        name: filename,
        type,
        parentId,
        isPublic,
      });

    return res.status(201).send({
      id: result.insertedId,
      userId,
      name: filename,
      type,
      isPublic,
      parentId,
    });
  }

  const folder = process.env.FOLDER_PATH || '/tmp/files_manager';
  const file = uuidv4();
  const localPath = `${folder}/${file}`;
  const fileData = Buffer.from(data, 'base64');

  await fs.mkdir(folder, { recursive: true }, (err) => {
    if (err) {
      return res.status(400).send({ error: err.message });
    }
    return true;
  });

  await fs.writeFile(localPath, fileData, (err) => {
    if (err) {
      return res.status(400).send({ error: err.message });
    }
    return true;
  });

  const result = await dbClient
    .files
    .insertOne({
      userId,
      name: filename,
      type,
      isPublic,
      parentId,
      localPath,
    });

  return res.status(201).send({
    id: result.insertedId,
    userId,
    name: filename,
    type,
    isPublic,
    parentId,
  });
}

export const getShow = async (req, res) => {
  // get the token from the header
  const user = await getUserFromHeader(req);
  if (!user) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  const file = await dbClient.files.findOne({
    _id: new ObjectId(id),
    userId: new ObjectId(user._id)
  });

  if (!file) {
    return res.status(404).send({ error: 'Not found' });
  }
  return res.send(file);
};

export const getIndex = async (req, res) => {
  const user = await getUserFromHeader(req);
  if (!user) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const itemsCount = 20;

  const { parentId, page = 0 } = req.query;

  const skip = page * itemsCount;

  const files = await dbClient.files.aggregate([
    { $match: { parentId: parentId || 0 } },
    { $skip: skip },
    { $limit: itemsCount }
  ]).toArray();

  return res.send(files);

};
