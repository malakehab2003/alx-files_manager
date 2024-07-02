import fs from 'fs';
import Queue from 'bull';
import imageThumbnails from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');

fileQueue.process((job, done) => {
  const { userId, fileId } = job.data;
  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }
  return dbClient.files.findOne({
    _id: new ObjectId(fileId),
    userId: new ObjectId(userId),
  }).then(async (file) => {
    if (!file) {
      throw new Error('File not found');
    }
    const { localPath } = file;
    const imageBuffer = fs.readFileSync(localPath);
    const widths = [500, 250, 100];
    for (let index = 0; index < width.length; index++) {
      const width = widths[index];

      const thumbnail = await imageThumbnail(localPath, {
        width: width
      });
      await fs.writeFile(`${localPath}_${width}`, thumbnail, (err) => {
        if (err) {
          throw err;
        }
        return true;
      });
    }
  });
});