import { expect } from 'chai';
import request from 'request';

describe('test appcontroller', () => {
  it('test getStatus', (done) => {
    const url = 'http://localhost:5000/status';
    request.get(url, (error, response, body) => {
      if (error) {
        done(error);
        return;
      }

      expect(response && response.statusCode).to.equal(200);
      expect(body).to.be.a('string');
      const parsedBody = JSON.parse(body);

      expect(parsedBody).to.deep.equal({ redis: true, db: true });
      done();
    });
  });

  it('test getStats', (done) => {
    const url = 'http://localhost:5000/stats';
    request.get(url, (error, response, body) => {
      if (error) {
        done(error);
        return;
      }

      expect(response && response.statusCode).to.equal(200);
      expect(body).to.be.a('string');
      const parsedBody = JSON.parse(body);

      expect(parsedBody).to.deep.equal({ users: 17, files: 10 });
      done();
    });
  });
});
