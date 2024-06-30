import { getUserFromToken } from './UsersController';
import dbClient from '../utils/db'
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

export async function postUpload(req, res) {
  // get the token from the header
  const header = req.header('X-Token');

  // get the user of the token
  const user = await getUserFromToken(header);

  //get the filename from body and check if not null
  const filename = req.body.name;

  if (!filename) {
    return res.status(400).send({error: 'Missing name'});
  }

  // get the type from the body
  // check if not null
  // if not in accepted_type
  const accepted_type = ['folder', 'file', 'image'];

  const type = req.body.type;

  if (!type || !accepted_type.includes(type)) {
    return res.status(400).send({error: 'Missing type'});
  }

  // get data and check if not null
  const data = req.body.data;

  if (!data && type !== 'folder') {
    return res.status(400).send({error: 'Missing data'});
  }

  // get the parent id if set
  // if set check if the parent file exists
  // if not set make it equal to zero
  const parentId = req.body.parentId || 0;

  if (parentId !== 0) {
    const parentFile = await dbClient
      .client
      .db(dbClient.database)
      .collection('files')
      .findOne({
        _id: new ObjectId(parentId)
      });

      if (!parentFile) {
        return res.status(400).send({error: 'Parent not found'});
      }

      if (parentFile.type !== 'folder') {
        return res.status(400).send({error: 'Parent is not a folder'});
      }
  }

  // get is public from body set it to false as default
  const isPublic = req.body.isPublic || false;

  // get the user id
  const user_id = user._id;

  // if type is folder return it
  if (type === 'folder') {
    const result = await dbClient
      .client
      .db(dbClient.database)
      .collection('files')
      .insertOne({
        'userId': user_id,
        'name': filename,
        'type': type,
        'parentId': parentId,
        'isPublic': isPublic
      });

    return res.status(201).send({
      'id': result.insertedId,
      'userId': user_id,
      'name': filename,
      'type': type,
      'isPublic': isPublic,
      'parentId': parentId
    });
  }

  const folder = process.env.FOLDER_PATH || '/tmp/files_manager';
  const file = uuidv4();
  const localPath = `${folder}/${file}`
  const file_data = Buffer.from(data, 'base64');

  await fs.mkdir(folder, { recursive: true }, (err) => {
    if (err) {
      return res.status(400).send({ error: err.message });
    }
    return true;
  });

  await fs.writeFile(localPath, file_data, (err) => {
    if (err) {
      return res.status(400).send({ error: err.message });
    }
    return true;
  });

  const result = await dbClient
    .client
    .db(dbClient.database)
    .collection('files')
    .insertOne({
      'userId': user_id,
      'name': filename,
      'type': type,
      'isPublic': isPublic,
      'parentId': parentId,
      'localPath': localPath
    });

    return res.status(201).send({
      'id': result.insertedId,
      'userId': user_id,
      'name': filename,
      'type': type,
      'isPublic': isPublic,
      'parentId': parentId,
    });
}
