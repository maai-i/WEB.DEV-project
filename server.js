//  recipes came from .... site
// ChatGPT was used to genirate some text in the /about rout.

const express = require('express'); //read the express library
const sqlite3 = require('sqlite3');
const { engine } = require('express-handlebars'); // Load the handelbars package for express
const bcrypt = require('bcrypt'); // to hash passwords
const session = require('express-session'); // to manage user sessions
const connectSqlite3 = require('connect-sqlite3'); // to store sessions in a SQLite database

const port = 8080; // define the port
const app = express(); // create the express application
const adminPassword = 'wde#2025'; // the admin password
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.engine('handlebars', engine()); // initialaze the engine to be handelbars
app.set('view engine', 'handlebars'); // set handelbars as the view engine
app.set('views', './views'); // define the views directory to be ./views

const dbFile = 'myRecipes.db'; //--db
db = new sqlite3.Database(dbFile);
// Improve SQLite concurrency & resilience against SQLITE_BUSY
// - WAL allows concurrent readers during writes
// - busy_timeout makes SQLite wait before giving up a lock
// - synchronous NORMAL is recommended with WAL for web apps
(db.serialize ? db.serialize.bind(db) : (fn)=>fn())(() => {
  db.run("PRAGMA journal_mode=WAL;");
  db.run("PRAGMA busy_timeout = 5000;");
  db.run("PRAGMA synchronous = NORMAL;");
});

// Helper to retry short write operations when the DB is momentarily locked
function runWithRetry(sql, params, done, attempts = 5, delayMs = 120) {
  const tryOnce = (left, wait) => {
    db.run(sql, params, function (err) {
      if (err && (err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_LOCKED') && left > 0) {
        return setTimeout(() => tryOnce(left - 1, Math.min(wait * 2, 1500)), wait);
      }
      return done.call(this, err);
    });
  };
  tryOnce(attempts, delayMs);
}

const SQLiteStore = connectSqlite3(session); // create the session store class

app.use(
  session({
    //define the session middleware
    store: new SQLiteStore({ db: 'session-db.db' }),
    saveUninitialized: false,
    resave: false,
    secret: 'mySecret123#thisShouldBeLonger',
  }),
);

app.use((req, res, next) => {
  res.locals.session = req.session || {};
  res.locals.user = req.session.user || null;
  next();
});

// creates table Person at startup
// db.run(`CREATE TABLE Person (pid INTEGER PRIMARY KEY, fname TEXT NOT NULL, lname
// TEXT NOT NULL, age INTEGER, email TEXT)`, function (error) {
// if (error) {
// // tests error: display error
// console.log("---> ERROR: ", error)
// } else {
// // tests error: no error, the table has been created
// console.log("---> Table created!")
// db.run(`INSERT INTO Person (fname, lname, age, email) VALUES ('John',
// 'Smith', 25, 'john.smith@example.com'), ('Jane', 'Doe', 30, 'jane.doe@mail.com'),
// ('Alex', 'Johnson', 40, 'alex.johnson@company.com'), ('Emily', 'Brown', 35,
// 'emily.brown@business.org'), ('Michael', 'Davis', 50, 'michael.davis@email.net'),
// ('Sarah', 'Miller', 28, 'sarah.miller@example.com'), ('David', 'Garcia', 45,
// 'david.garcia@mail.com'), ('Laura', 'Rodriguez', 32,
// 'laura.rodriguez@company.com'), ('Chris', 'Wilson', 27,
// 'chris.wilson@business.org'), ('Anna', 'Martinez', 22, 'anna.martinez@email.net'),
// ('James', 'Taylor', 53, 'james.taylor@example.com'), ('Patricia', 'Anderson', 44,
// 'patricia.anderson@mail.com'), ('Robert', 'Thomas', 38,
// 'robert.thomas@company.com'), ('Linda', 'Hernandez', 55,
// 'linda.hernandez@business.org'), ('William', 'Moore', 26,
// 'william.moore@email.net'), ('Barbara', 'Jackson', 37,
// 'barbara.jackson@example.com'), ('Richard', 'White', 49, 'richard.white@mail.com'),
// ('Susan', 'Lee', 24, 'susan.lee@company.com'), ('Joseph', 'Clark', 41,
// 'joseph.clark@business.org'), ('Jessica', 'Walker', 29,
// 'jessica.walker@email.net');` , function (err) {
// if (err) {
// console.log(err.message)
// } else {
// console.log('---> Rows inserted in the table Person.')
// }
// })
// }
// })

app.get('/', (req, res) => {
  // define the default '/'
  //res.send('Hello world!')
  res.render('home.handlebars');
});

//define the '/about' route (My project)
app.get('/about', (req, res) => {
  res.render('about.handlebars');
});

//define the '/contact' rout (My project)
app.get('/contact', (req, res) => {
  res.render('contact.handlebars');
});

app.get('/recipes', function (req, res) {
  db.all('SELECT * FROM Recipe', (error, listOfRecipes) => {
    if (error) {
      console.log('ERROR: ', error); // error: diplay in terminal
      res.redirect('/');
    } else {
      const model = { recipes: listOfRecipes };
      res.render('recipes.handlebars', model);
    }
  });
});



app.get('/ingredients', function (req, res) {
  db.all('SELECT * FROM Ingredient', (error, listOfIngredients) => {
    if (error) {
      console.log('ERROR: ', error); // error: diplay in terminal
    } else {
      const model = { ingredients: listOfIngredients };
      res.render('ingredient.handlebars', model);
    }
  });
});

// --- Ingredient CRUD used by the Ingredients page ---

// Create an ingredient (form on the right column)
app.post('/ingredients', (req, res) => {
  const { name, remark } = req.body || {};

  const renderWithError = (msg) => {
    db.all('SELECT * FROM Ingredient', (error, listOfIngredients) => {
      if (error) {
        console.log('ERROR while reloading ingredients:', error);
        return res.redirect('/');
      }
      return res.status(400).render('ingredient.handlebars', {
        error: msg,
        ingredients: listOfIngredients,
      });
    });
  };

  if (!name || !String(name).trim()) {
    return renderWithError("'Name' is required");
  }

  const sql = 'INSERT INTO Ingredient (name, remark) VALUES (?, ?)';
  runWithRetry(sql, [String(name).trim(), remark ?? null], function (err) {
    if (err) {
      console.error('Insert ingredient error:', err);
      return renderWithError('Failed to add ingredient.');
    }
    return res.redirect('/ingredients');
  });
});

// Show edit form for a single ingredient (triggered by the Edit button)
app.get('/ingredients/:id/edit', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM Ingredient WHERE iID = ? LIMIT 1', [id], (err, ingredient) => {
    if (err) {
      console.error('Fetch ingredient error:', err);
      return res.redirect('/ingredients');
    }
    if (!ingredient) {
      return res.redirect('/ingredients');
    }
    // Render a dedicated edit page (create views/ingredient-edit.handlebars if not present)
    return res.render('ingredient-edit.handlebars', { ingredient });
  });
});

// Handle edit form submission (you can point the edit form action here)
app.post('/ingredients/:id/edit', (req, res) => {
  const { id } = req.params;
  const { name, remark } = req.body || {};

  if ((name && !String(name).trim())) {
    // Empty after trimming
    return res.redirect('/ingredients');
  }

  const sql = `UPDATE Ingredient
               SET name = COALESCE(?, name),
                   remark = COALESCE(?, remark)
               WHERE iID = ?`;
  runWithRetry(sql, [name ? String(name).trim() : null, remark ?? null, id], function (err) {
    if (err) {
      console.error('Update ingredient error:', err);
      return res.redirect('/ingredients');
    }
    return res.redirect('/ingredients');
  });
});

// Delete an ingredient (triggered by the Delete button)
app.post('/ingredients/:id/delete', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM Ingredient WHERE iID = ?';
  runWithRetry(sql, [id], function (err) {
    if (err) {
      console.error('Delete ingredient error:', err);
      return res.redirect('/ingredients');
    }
    return res.redirect('/ingredients');
  });
});

// --- Recipe CRUD API (JSON) ---
// NOTE: Adjust the column names (name, description) to match your actual Recipe schema if different
// For example, change to (title, details) or similar if needed.

// Create a recipe
app.post('/api/recipes', (req, res) => {
  const { name, description } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "'name' is required" });
  }

  // Insert with explicit columns; adjust if your schema differs
  const sql = 'INSERT INTO Recipe (name, description) VALUES (?, ?)';
  runWithRetry(sql, [name, description ?? null], function (err) {
    if (err) {
      console.error('Insert recipe error:', err);
      return res.status(500).json({ error: 'Failed to insert recipe' });
    }
    // this.lastID is the rowid of the inserted row
    return res.status(201).json({ id: this.lastID, name, description: description ?? null });
  });
});

// Update a recipe (partial update)
app.put('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body || {};
  if (name === undefined && description === undefined) {
    return res.status(400).json({ error: 'Provide at least one field to update (name, description)' });
  }

  // Use COALESCE to keep existing values when a field is omitted; use rowid so it works even if PK column name differs
  const sql = `UPDATE Recipe
               SET name = COALESCE(?, name),
                   description = COALESCE(?, description)
               WHERE rowid = ?`;
  runWithRetry(sql, [name ?? null, description ?? null, id], function (err) {
    if (err) {
      console.error('Update recipe error:', err);
      return res.status(500).json({ error: 'Failed to update recipe' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    return res.json({ id: Number(id), name, description });
  });
});

// Delete a recipe
app.delete('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM Recipe WHERE rowid = ?';
  runWithRetry(sql, [id], function (err) {
    if (err) {
      console.error('Delete recipe error:', err);
      return res.status(500).json({ error: 'Failed to delete recipe' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    return res.status(204).send();
  });
});

// Helper: detect if a string looks like a bcrypt hash
function isBcryptHash(str) {
  return (
    typeof str === 'string' &&
    /^\$2[aby]?\$[0-9]{2}\$[./A-Za-z0-9]{53}$/.test(str)
  );
}

// Ensure an admin user exists and has a bcrypt-hashed password
function ensureAdminUser(callback) {
  const uname = 'admin';
  db.get(
    'SELECT * FROM User WHERE userName = ? LIMIT 1',
    [uname],
    (err, user) => {
      if (err) {
        console.error('ensureAdminUser: DB error:', err);
        return callback && callback(err);
      }

      const setHash = (pw, done) =>
        bcrypt.hash(pw, 12, (e, hash) => done(e, hash));

      // If no admin user, create one with a secure dev/default password
      if (!user) {
        return setHash(DEFAULT_ADMIN_PASSWORD, (hashErr, hash) => {
          if (hashErr) {
            console.error('ensureAdminUser: hash error:', hashErr);
            return callback && callback(hashErr);
          }
          runWithRetry(
            'INSERT INTO User (userName, passWord) VALUES (?, ?)',
            [uname, hash],
            (insErr) => {
              if (insErr) {
                console.error('ensureAdminUser: insert error:', insErr);
                return callback && callback(insErr);
              }
              console.warn(
                'ensureAdminUser: Created admin user with initial password from ADMIN_INITIAL_PASSWORD env var (or default). CHANGE IT ASAP.',
              );
              return callback && callback(null);
            },
          );
        });
      }

      // If admin exists but password is not a bcrypt hash, reset it to a known hashed value
      if (!isBcryptHash(user.passWord)) {
        return setHash(DEFAULT_ADMIN_PASSWORD, (hashErr, hash) => {
          if (hashErr) {
            console.error('ensureAdminUser: hash error:', hashErr);
            return callback && callback(hashErr);
          }
          runWithRetry(
            'UPDATE User SET passWord = ? WHERE uID = ?',
            [hash, user.uID],
            (updErr) => {
              if (updErr) {
                console.error('ensureAdminUser: update error:', updErr);
                return callback && callback(updErr);
              }
              console.warn(
                'ensureAdminUser: Admin password was plaintext/invalid. It has been reset. Use ADMIN_INITIAL_PASSWORD to control the value.',
              );
              return callback && callback(null);
            },
          );
        });
      }

      // All good
      console.log(
        'ensureAdminUser: Admin user exists with a valid bcrypt hash.',
      );
      return callback && callback(null);
    },
  );
}

// login form
app.get('/login', (req, res) => {
  res.render('login.handlebars');
});
// Login processing
app.post('/login', (req, res) => {
  // Read form (urlencoded) or JSON body
  const { username, password } = req.body || {};

  // Basic validation with early returns
  if (!username || !password) {
    return res.status(400).send('Bad Request: Missing username or password.');
  }

  // Single query, supporting either column name (username or userName)
  db.get(
    'SELECT * FROM User WHERE userName = ? LIMIT 1',
    [username],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.render('login.handlebars', {
          error: 'Internal server error. Please try again later.',
        });
      }

      if (!user) {
        return res.render('login.handlebars', {
          error: 'Invalid username or password.',
        });
      }

      // Ensure we actually have a stored hash
      if (!user.passWord || typeof user.passWord !== 'string') {
        console.error(
          'Stored password hash is missing or invalid for user:',
          user.userName,
        );
        return res.render('login.handlebars', {
          error: 'Internal server error. Please contact support.',
        });
      }

      // Compare plaintext password with stored bcrypt hash
      bcrypt.compare(password, user.passWord, (compareErr, ok) => {
        if (compareErr) {
          console.error('Error comparing passwords:', compareErr);
          return res.render('login.handlebars', {
            error: 'Internal server error. Please try again later.',
          });
        }
        if (!ok) {
          console.log('The password does not match (user:', username, ')');
          return res.render('login.handlebars', {
            error: 'Invalid username or password.',
          });
        }

        // Success: create session and redirect
        req.session.user = {
          uID: user.uID,
          username: user.userName,
          isAdmin: username === 'admin',
        };

        console.log('User logged in:', req.session.user);
        return res.redirect('/');
      });
    },
  );
});

//logout prossessing
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    // destroy the session
    if (err) {
      console.log('Error destroying session:', err);
      res.redirect('/'); // Redirect to home page even if error occurs
    } else {
      console.log('loged out successfully.');
      res.redirect('/'); // Redirect to home page after logout
    }
  });
});
// raw data of persons
app.get('/rawpersons', function (req, res) {
  db.all('SELECT * FROM Person', function (err, rowPerson) {
    if (err) {
      console.log('Error: ' + err);
      res.status(500).send('Internal Server Error');
    } else {
      console.log('Data found, sending back to the client...');
      res.send(rowPerson);
    }
  });
});

function hashPassword(pw, saltRounds) {
  bcrypt.hash(pw, saltRounds, function (err, hash) {
    if (err) {
      console.error('---> Error hashing password:', err);
    } else {
      console.log('---> Hashed password:', hash);
    }
  });
}

app.listen(port, () => {
  // listen on the port
  ensureAdminUser(() => {
    // Admin check complete
  });
  hashPassword('wdf#2025', 12); // hash the password 'wdf#2025' with 12 salt rounds
  console.log(`server up and running on http://localhost:${port}...`);
});
