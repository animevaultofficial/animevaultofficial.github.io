// api/vidplus.js
import express from 'express';
import { readFile } from 'fs/promises';
import path from 'path';

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

const router = express.Router();
router.use(express.json());

router.get('/readme', async (req, res) => {
  try {
    const mdPath = path.resolve(process.cwd(), 'VIDPLUS_README.md');
    const md = await readFile(mdPath, 'utf8');
    res.type('text/markdown').send(md);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (req, res) => res.redirect('/api/vidplus/readme'));

app.use('/api/vidplus', router);
app.use('/vidplus', router);

export default app;
