// Configure EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../web-app'));

// --- Template Routes ---
// Serve HTML pages with CSRF token injection using EJS templates

// Homepage
app.get('/', (req, res) => {
  res.render('index', { csrfToken: res.locals.csrfToken });
});

// Transaction page
app.get('/transaction', (req, res) => {
  res.render('transaction', { csrfToken: res.locals.csrfToken });
});

// Summary page
app.get('/summary', (req, res) => {
  res.render('summary', { csrfToken: res.locals.csrfToken });
});

// Staff page
app.get('/staff', (req, res) => {
  res.render('staff', { csrfToken: res.locals.csrfToken });
});

// Services page
app.get('/services', (req, res) => {
  res.render('services', { csrfToken: res.locals.csrfToken });
});

// Static assets (CSS, JS, images) - keep these as static files
app.use('/css', express.static(path.join(__dirname, '../web-app/css')));
app.use('/js', express.static(path.join(__dirname, '../web-app/js')));
app.use('/images', express.static(path.join(__dirname, '../web-app/images')));
app.use('/assets', express.static(path.join(__dirname, '../web-app/assets')));
