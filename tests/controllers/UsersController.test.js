import { expect } from 'chai';
import request from 'request';
import { v4 as uuidv4 } from 'uuid';

describe('test user controller', () => {
  it('test postNew function', (done) => {
    const url = 'http://localhost:5000/users';
    const uniqueEmail = `${uuidv4()}@dylan.com`;
    const requestData = {
      email: uniqueEmail,
      password: 'toto1234!'
    };

    request.post({
      url: url,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    }, (error, response, body) => {
      if (error) {
        console.error(error);
        done(error);
      }

      expect(response && response.statusCode).to.equal(201);
      expect(body).to.be.a('string');
      const parsedBody = JSON.parse(body);

      expect(parsedBody).to.be.an('object');
      expect(parsedBody).to.have.property('id');
      expect(parsedBody).to.have.property('email').that.is.equal(uniqueEmail);
      done()
    });
  })

  it('should generate token and use it to get user details', (done) => {
    const connectUrl = 'http://localhost:5000/connect';
    const meUrl = 'http://localhost:5000/users/me';
    
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

      // Now use the token to get user details
      request.get({
        url: meUrl,
        headers: {
          'X-Token': token
        }
      }, (error, response, body) => {
        if (error) {
          console.error('Error during get user details:', error);
          return done(error);
        }

        expect(response && response.statusCode).to.equal(200);
        expect(body).to.be.a('string');
        
        let userBody;
        try {
          userBody = JSON.parse(body);
        } catch (err) {
          return done(new Error('Invalid JSON response from user details'));
        }

        expect(userBody).to.be.an('object');
        expect(userBody).to.have.property('id');
        expect(userBody).to.have.property('email').that.is.equal('bob@dylan.com');
        done();
      });
    });
  });
});
