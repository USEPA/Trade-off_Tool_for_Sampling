const supertest = require('supertest');
const app = require('../app/app');

describe('API Tests', () => {
  test('GET /api/health should return UP', async () => {
    const response = await supertest(app)
      .get('/api/health')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({ status: 'UP' });
  });

  test('GET /api/lookupFiles should return config json', async () => {
    const response = await supertest(app)
      .get('/api/lookupFiles')
      .expect(200)
      .expect('Content-Type', /json/);
  });

  test('GET /api/supportedBrowsers', async () => {
    await supertest(app)
      .get('/api/supportedBrowsers')
      .expect(200)
      .expect('Content-Type', /json/);
  });

  test('GET non existent api route', async () => {
    const response = await supertest(app)
      .get('/api/thisIsNotReal')
      .expect(404)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({ message: 'The api route does not exist.' });
  });

  test('POST non existent api route', async () => {
    const response = await supertest(app)
      .post('/api/thisIsNotReal')
      .expect(404)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({ message: 'The api route does not exist.' });
  });

  test('GET test checkClientRouteExists middleware', async () => {
    await supertest(app).get('/decon').expect(500);
  });

  test('GET test checkClientRouteExists middleware', async () => {
    await supertest(app).get('/deconTest').expect(404);
  });

  test('PUT should be unauthorized', async () => {
    await supertest(app).put('/api/health').expect(401);
  });

  test('DELETE should be unauthorized', async () => {
    await supertest(app).delete('/api/health').expect(401);
  });

  test('GET nonexistent route', async () => {
    await supertest(app)
      .get('/bogusRoute')
      .expect(404)
      .expect('Content-type', 'text/html; charset=utf-8');
  });
});
