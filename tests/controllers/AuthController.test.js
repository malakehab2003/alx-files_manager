import { expect } from 'chai';
import request from 'request';

describe('test AuthController file', () => {
  it('test getConnect function then test getDisconnect function', (done) => {
    const connectUrl = 'http://localhost:5000/connect';
    // First, connect and get the token
    request.get({
      url: connectUrl,
      headers: {
        'Authorization': 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE='
      }
    }, (error, response, body) => {
      if (error) {
        console.error('Error during connect:', error);
        return done(error);
      }

      expect(response && response.statusCode).to.equal(200);
      expect(body).to.be.a('string');
      
      let parsedBody;
      try {
        parsedBody = JSON.parse(body);
      } catch (err) {
        return done(new Error('Invalid JSON response from connect'));
      }

      expect(parsedBody).to.have.property('token');

      const token = parsedBody.token;
      const url = 'http://localhost:5000/disconnect'

      request.get({
        url,
        headers: {
          'X-Token': token
        }
      }, (error, response, body) => {
        if (error) {
          console.error(error);
          done(error);
        }

        expect(response && response.statusCode).to.equal(204);
      });
      done();
    });
  });
})
