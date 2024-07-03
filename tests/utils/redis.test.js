import { expect } from'chai';
import RedisClient, { redisClient } from '../../utils/redis';

describe('test redis', () => {
  it('test isAlive', () => {
    const alive = RedisClient.isAlive()
    expect(alive).to.equal(true);
  });

  it('test get/set', async () => {
    await RedisClient.set('key', 'value', 100);
    const get = await RedisClient.get('key');
    expect(get).to.equal('value');
  });

  it('test del', async () => {
    await RedisClient.set('key', 'value', 100);
    let get = await RedisClient.get('key');
    expect(get).to.equal('value');
    await RedisClient.del('key');
    get = await RedisClient.get('key');
    expect(get).not.to.equal('value');
  });

  it('test duration', async () => {
    await RedisClient.set('key', 'value', 1);
    let get = await RedisClient.get('key');
    expect(get).to.equal('value');
    await new Promise((resolve) => setTimeout(resolve, 1100));
    get = await RedisClient.get('key');
    expect(get).not.to.equal('value');
  });
});