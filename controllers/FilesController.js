import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import { lookup } from 'mime-types';
import Queue from 'bull';
import { getUserFromHeader } from './UsersController';
import dbClient from '../utils/db';

const folder = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileQueue = new Queue('fileQueue');

export async function getParentId(req) {
  const parentId = req.body.parentId || 0;

  if (parentId !== 0) {
    const parentFile = await dbClient
      .files
      .findOne({
        _id: new ObjectId(parentId),
      });

    if (!parentFile) {
      throw new Error('Parent not found');
    }

    if (parentFile.type !== 'folder') {
      throw new Error('Parent is not a folder');
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
  let parentId;
  try {
    parentId = await getParentId(req);
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }

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

  const file = uuidv4();
  const localPath = `${folder}/${file}`;
  const fileData = Buffer.from(data, 'base64');

  try {
    await fs.mkdir(folder, { recursive: true }, (err) => {
      if (err) {
        throw err;
      }
      return true;
    });

    await fs.writeFile(localPath, fileData, (err) => {
      if (err) {
        throw err;
      }
      return true;
    });
  } catch (err) {
    return res.status(400).send({ error: err.message });
  }

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
  const { insertedId } = result;
  if (type === 'image') {
    fileQueue.add({
      userId: user._id.toString(),
      fileId: insertedId.toString(),
    });
  }
  return res.status(201).send({
    id: insertedId,
    userId,
    name: filename,
    type,
    isPublic,
    parentId,
  });
}

function fileFormat(file) {
  const res = {
    id: file._id,
    ...file,
  };
  delete res._id;
  delete res.localPath;
  return res;
};

export async function getShow(req, res) {
  // get the token from the header
  const user = await getUserFromHeader(req);
  if (!user) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  const file = await dbClient.files.findOne({
    _id: new ObjectId(id),
    userId: user._id,
  });

  if (!file) {
    return res.status(404).send({ error: 'Not found' });
  }
  return res.send(fileFormat(file));
}

export async function getIndex(req, res) {
  const user = await getUserFromHeader(req);
  if (!user) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const itemsCount = 20;

  const { parentId, page = '0' } = req.query;

  const skip = parseInt(page, 10) * itemsCount;

  const files = (await dbClient.files.aggregate([
    { $match: { parentId: parentId && parentId !== '0' ? parentId : 0 } },
    { $skip: skip },
    { $limit: itemsCount },
  ]).toArray()).map((file) => fileFormat(file));

  return res.send(files);
}

export async function putPublish(req, res) {
  // get the token from the header
  const user = await getUserFromHeader(req);
  if (!user) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  const file = (await dbClient.files.findOneAndUpdate({
    _id: new ObjectId(id),
    userId: user._id,
  }, {
    $set: { isPublic: true },
  }, {
    returnDocument: 'after',
  })).value;

  if (!file) {
    return res.status(404).send({ error: 'Not found' });
  }

  return res.send(fileFormat(file));
}

export async function putUnpublish(req, res) {
  // get the token from the header
  const user = await getUserFromHeader(req);
  if (!user) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  const file = (await dbClient.files.findOneAndUpdate({
    _id: new ObjectId(id),
    userId: user._id,
  }, {
    $set: { isPublic: false },
  }, {
    returnDocument: 'after',
  })).value;

  if (!file) {
    return res.status(404).send({ error: 'Not found' });
  }

  return res.send(fileFormat(file));
}

export async function getFile(req, res) {
  const { id } = req.params;
  const file = await dbClient.files.findOne({
    _id: new ObjectId(id),
  });

  if (!file) {
    return res.status(404).send({ error: 'Not found' });
  }

  const { isPublic, name, localPath } = file;
  const user = await getUserFromHeader(req);
  if (!isPublic && (
    !user || user._id.toString() !== file.userId.toString()
  )) {
    return res.status(404).send({ error: 'Not found' });
  }

  if (file.type === 'folder') {
    return res.status(400).send({ error: 'A folder doesn\'t have content' });
  }

  try {
    const mimeType = lookup(name);
    const { size } = req.query;
    const filePath = !size ? localPath : `${localPath}_${size}`;
    const data = fs.readFileSync(filePath);
    res.type(mimeType || 'application/octet-stream');
    return res.send(data);
  } catch (error) {
    return res.status(404).send({ error });
  }
}
