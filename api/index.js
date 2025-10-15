const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Root endpoint
app.get('/', function(req, res) {
  res.json({ status: 'ok', message: 'Strava proxy server is running' });
});

// Health check
app.get('/health', function(req, res) {
  res.status(200).json({ status: 'ok' });
});

// OAuth flow initiation
app.get('/auth/strava', function(req, res) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return res.status(500).json({ 
      error: 'Missing Strava configuration'
    });
  }
  
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=auto&scope=activity:read_all`;
  
  res.redirect(authUrl);
});

// OAuth callback
app.get('/auth/strava/callback', function(req, res) {
  const code = req.query.code;
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  
  if (!code) {
    return res.redirect(process.env.FRONTEND_URL + '?error=no_code');
  }

  fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code'
    })
  })
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    const params = new URLSearchParams({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at
    });
    res.redirect(process.env.FRONTEND_URL + '?auth=success&' + params.toString());
  })
  .catch(function(error) {
    console.error('OAuth error:', error);
    res.redirect(process.env.FRONTEND_URL + '?error=auth_failed');
  });
});

// Refresh token endpoint
app.post('/auth/strava/refresh', function(req, res) {
  const refreshToken = req.body.refresh_token;
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    res.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at
    });
  })
  .catch(function(error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  });
});

// Get athlete info
app.get('/api/strava/athlete', function(req, res) {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  fetch('https://www.strava.com/api/v3/athlete', {
    headers: {
      'Authorization': token
    }
  })
  .then(function(response) {
    if (!response.ok) {
      return response.json().then(function(errData) {
        throw new Error('Invalid token');
      });
    }
    return response.json();
  })
  .then(function(data) {
    res.json(data);
  })
  .catch(function(error) {
    console.error('Athlete fetch error:', error);
    res.status(401).json({ error: 'Failed to verify token' });
  });
});

// Get activities
app.get('/api/strava/activities', function(req, res) {
  const token = req.headers.authorization;
  const perPage = req.query.per_page || 100;
  const page = req.query.page || 1;
  
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  fetch(
    'https://www.strava.com/api/v3/athlete/activities?per_page=' + perPage + '&page=' + page,
    {
      headers: {
        'Authorization': token
      }
    }
  )
  .then(function(response) {
    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }
    return response.json();
  })
  .then(function(data) {
    res.json(data);
  })
  .catch(function(error) {
    console.error('Activities fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  });
});

// Get specific activity
app.get('/api/strava/activities/:id', function(req, res) {
  const token = req.headers.authorization;
  const activityId = req.params.id;
  
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  fetch(
    'https://www.strava.com/api/v3/activities/' + activityId,
    {
      headers: {
        'Authorization': token
      }
    }
  )
  .then(function(response) {
    if (!response.ok) {
      throw new Error('Failed to fetch activity');
    }
    return response.json();
  })
  .then(function(data) {
    res.json(data);
  })
  .catch(function(error) {
    console.error('Activity fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch activity details' });
  });
});

// Claude AI analysis
app.post('/api/claude/analyze', function(req, res) {
  const analysisData = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Claude API key not configured'
    });
  }

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(analysisData)
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('Claude API request failed');
    }
    return response.json();
  })
  .then(function(data) {
    res.json(data);
  })
  .catch(function(error) {
    console.error('Claude API error:', error);
    res.status(500).json({ error: 'Failed to get AI analysis: ' + error.message });
  });
});

// Export for Vercel
module.exports = app;