import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${this.host}:${this.port}/${this.database}`;

    this.client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    this.client.connect();
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    try {
      return await this.client.db(this.database).collection('users').countDocuments();
    } catch (err) {
      console.error('Error counting users:', err);
      return 0;
    }
  }

  async nbFiles() {
    try {
      return await this.client.db(this.database).collection('files').countDocuments();
    } catch (err) {
      console.error('Error counting files:', err);
      return 0;
    }
  }
}

const dbClient = new DBClient();
export default dbClient;
