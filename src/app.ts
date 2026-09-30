import express from 'express';
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Sample route
app.get('/', (req: express.Request, res: express.Response): void => {
  res.send('Hello, World!');
});

export { app };
