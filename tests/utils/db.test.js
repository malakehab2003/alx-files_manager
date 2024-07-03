import { expect } from'chai';
import DbClient from '../../utils/db';


describe('test db', () => {
  it('test is alive', async() => {
    const alive = await DbClient.isAlive();
    expect(alive).to.equal(false);
  });

  it('test nbUsers', async () => {
    const nbUser = await DbClient.nbUsers();
    expect(nbUser).to.equal(17);
  });

  it('test nbFiles', async () => {
    const nbFile = await DbClient.nbFiles();
    expect(nbFile).to.equal(10);
  });
})
