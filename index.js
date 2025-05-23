const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const app = express();
const port = 8080;

app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_session_secret', // Use environment variable
  resave: false,
  saveUninitialized: true,
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Configure Google OAuth 2.0 strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // For this example, the user profile is directly used.
    // In a real app, you might want to find or create a user in your database.
    return done(null, profile);
  }
));

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((obj, done) => {
  done(null, obj);
});


// let userMemos = {
//   'googleUserId123': [{id: 1, text: 'My memo'}, ...],
//   'googleUserId456': [{id: 1, text: 'Another memo'}, ...],
// };
const userMemos = {};
// Note: nextId will now be managed per user in the POST /memos route.

// Authentication Routes
// Initiate Google OAuth flow
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Handle Google OAuth callback
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to memos or home.
    res.redirect('/memos');
  }
);

// Logout
app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) { return next(err); }
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
});

// Middleware to ensure user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/'); // Or to a login page
}

// Create a new memo
app.post('/memos', ensureAuthenticated, (req, res) => {
  const { memo } = req.body;
  const userId = req.user.id; // Get user ID from authenticated user

  if (!memo) {
    return res.status(400).json({ error: 'Memo content is required' });
  }

  // Initialize memos array for user if it doesn't exist
  if (!userMemos[userId]) {
    userMemos[userId] = [];
  }

  // Determine the next ID for this user's memos
  const userSpecificNextId = (userMemos[userId].length > 0) ? Math.max(...userMemos[userId].map(m => m.id)) + 1 : 1;
  const newMemo = { id: userSpecificNextId, memo };
  userMemos[userId].push(newMemo);
  res.status(201).json(newMemo);
});

// Get all memos for the logged-in user
app.get('/memos', ensureAuthenticated, (req, res) => {
  const userId = req.user.id;
  const memosForUser = userMemos[userId] || [];
  // Basic HTML for displaying memos and forms
  let html = `<h1>Your Memos, ${req.user.displayName}</h1><a href="/logout">Logout</a>`;
  html += '<form action="/memos" method="post"><textarea name="memo" placeholder="Enter your memo"></textarea><button type="submit">Add Memo</button></form>';
  html += '<ul>';
  memosForUser.forEach(memo => {
    html += `<li>${memo.memo} (ID: ${memo.id}) 
             <form action="/memos/${memo.id}?_method=DELETE" method="POST" style="display:inline;">
               <button type="submit">Delete</button>
             </form>
           </li>`;
  });
  html += '</ul>';
  // A simple way to allow DELETE via POST for HTML forms
  // In a real app, you'd use client-side JS or a library like method-override
  if(req.query._method === 'DELETE') {
    req.method = 'DELETE';
    // Re-route to the delete handler, ensuring the path is correct
    // This is a simplified approach; method-override middleware is better for this.
    return app._router.handle(req, res, () => {}); // This is a bit of a hack for simple cases
  }
  res.send(html);
});

// Delete a memo by ID for the logged-in user
app.delete('/memos/:id', ensureAuthenticated, (req, res) => {
  const userId = req.user.id;
  const memoId = parseInt(req.params.id);

  if (!userMemos[userId]) {
    return res.status(404).json({ error: 'No memos found for this user' });
  }

  const memoIndex = userMemos[userId].findIndex(m => m.id === memoId);
  if (memoIndex === -1) {
    return res.status(404).json({ error: 'Memo not found' });
  }

  userMemos[userId].splice(memoIndex, 1);
  // res.json({ message: 'Memo deleted successfully' });
  res.redirect('/memos'); // Redirect back to memos list after deletion
});

// Root route - display login or user info
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`
      <h1>Hello, ${req.user.displayName}</h1>
      <p>Email: ${req.user.emails && req.user.emails.length > 0 ? req.user.emails[0].value : 'N/A'}</p>
      <a href="/memos">View Your Memos</a><br>
      <a href="/logout">Logout</a>
    `);
  } else {
    res.send('<h1>Welcome to the Memo App</h1><a href="/auth/google">Login with Google</a>');
  }
});

app.listen(port, () => {
  console.log(`Memo app listening on port ${port}`);
});
