const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/strava/athlete', async (req, res) => {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': token
      }
    });

    if (!response.ok) {
      throw new Error('Invalid token');
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(401).json({ error: 'Failed to verify token' });
  }
});

app.get('/api/strava/activities', async (req, res) => {
  const token = req.headers.authorization;
  const perPage = req.query.per_page || 30;
  const page = req.query.page || 1;
  
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`,
      {
        headers: {
          'Authorization': token
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

app.get('/api/strava/activities/:id', async (req, res) => {
  const token = req.headers.authorization;
  const activityId = req.params.id;
  
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: {
          'Authorization': token
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch activity');
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity details' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Strava proxy server running on http://localhost:${PORT}`);
});
