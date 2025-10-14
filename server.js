const express = require('express');
const cors = require('cors');

// Only import node-fetch if native fetch doesn't exist (Node < 18)
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}


const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(o => o && origin && origin.includes(o))) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(express.json());

// Add these endpoints to your server.js

// OAuth flow initiation - redirects to Strava
app.get('/auth/strava', function(req, res) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=auto&scope=activity:read_all`;
  
  res.redirect(authUrl);
});

// OAuth callback - Strava redirects here after authorization
app.get('/auth/strava/callback', function(req, res) {
  const code = req.query.code;
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  
  if (!code) {
    return res.redirect(process.env.FRONTEND_URL + '?error=no_code');
  }

  // Exchange code for tokens
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
    // Redirect back to frontend with tokens
    const params = new URLSearchParams({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at
    });
    res.redirect(process.env.FRONTEND_URL + '/auth/callback?' + params.toString());
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

app.get('/api/strava/athlete', function(req, res) {
  const token = req.headers.authorization;
  
  console.log('Received request for athlete');
  console.log('Token present:', !!token);
  
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  fetch('https://www.strava.com/api/v3/athlete', {
    headers: {
      'Authorization': token
    }
  })
  .then(function(response) {
    console.log('Strava response status:', response.status);
    if (!response.ok) {
      return response.json().then(function(errData) {
        console.log('Strava error response:', errData);
        throw new Error('Invalid token');
      });
    }
    return response.json();
  })
  .then(function(data) {
    console.log('Success! Got athlete data');
    res.json(data);
  })
  .catch(function(error) {
    console.error('Athlete fetch error:', error);
    res.status(401).json({ error: 'Failed to verify token' });
  });
});

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

app.get('/health', function(req, res) {
  res.json({ status: 'ok' });
});

app.post('/api/claude/analyze', function(req, res) {
  const analysisData = req.body;
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Claude API key not configured. Set ANTHROPIC_API_KEY environment variable.' 
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

app.listen(PORT, function() {
  console.log('Strava proxy server running on port ' + PORT);
});
