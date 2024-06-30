import express from 'express';
import router from './routes/index';
import bodyParser from 'body-parser';

const port = process.env.PORT || 5000;

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', router);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;
