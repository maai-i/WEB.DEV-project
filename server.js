//  recipes came from .... site 
// ChatGPT was used to genirate some text in the /about rout.

const express=require('express') //read the express library
const sqlite3=require('sqlite3')
const { engine }=require('express-handlebars') // Load the handelbars package for express
const bcrypt=require('bcrypt') // to hash passwords
const session=require('express-session') // to manage user sessions
const connectSqlite3=require('connect-sqlite3') // to store sessions in a SQLite database

const port=8080 // define the port
const app=express() // create the express application
const adminPassword='wde#2025' // the admin password



app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

app.engine('handlebars', engine()) // initialaze the engine to be handelbars
app.set('view engine', 'handlebars') // set handelbars as the view engine
app.set('views', './views') // define the views directory to be ./views

const dbFile='myRecipes.db'//--db
db = new sqlite3.Database(dbFile)

const SQLiteStore=connectSqlite3(session) // create the session store class

app.use(session({ //define the session middleware
    store: new SQLiteStore({db: "session-db.db"}),
    "saveUninitialized": false,
    "resave": false,
    "secret": 'mySecret123#thisShouldBeLonger'
}))

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


app.get('/', (req, res) => { // define the default '/'
    //res.send('Hello world!')
    res.render('home.handlebars')
})

//define the '/about' route (My project)
app.get('/about', (req, res) =>{
    res.render('about.handlebars')
})

//define the '/contact' rout (My project)
app.get('/contact', (req, res) =>{
    res.render('contact.handlebars')
})

app.get('/recipes', function (req, res){
    db.all("SELECT * FROM Recipe", (error, listOfRecipes) => {
        if(error){
            console.log("ERROR: ", error) // error: diplay in terminal
            res.redirect('/')
        } else{
            const model={ recipes: listOfRecipes }
            res.render('recipes.handlebars', model)
        }
    })
})

app.get('/ingredients', function (req, res){
    db.all("SELECT * FROM Ingredient", (error, listOfIngredients) => {
        if(error){
            console.log("ERROR: ", error) // error: diplay in terminal
        } else{
            const model={ ingredients: listOfIngredients }
            res.render('ingredient.handlebars', model)
        }
    })
})
// login form
app.get('/login', (req, res) => {
    res.render('login.handlebars')
});
// Login processing
app.post('/login', (req, res) => {
    console.log('0')
    console.log('req.body: ', req.body);
    // Alternative 1
    const { username, password } = req.body;
    // Alternative 2
    // const username = req.query.username;
    // const password = req.query.password;
    console.log('username: '+username)
    console.log('password: '+password)
    //verification steps
    if(!username || !password) {
        res.status(400).send('Bad Request: Missing username or password.')
    }

    console.log('1')
    db.get('SELECT * FROM User WHERE username = ?', [username], (err, user) => {
        if(err) {
        console.error('Database error:', err);
        res.render('login.handlebars', { error: 'Internal server error. Please try again later.' });
        }
        db.get('SELECT * FROM User WHERE userName = ?', [username], (err, user) => {
            if(err) {
                console.error('Database error:', err);
                res.render('login.handlebars', { error: 'Internal server error. Please try again later.' });
            }
            if(!user) {
                return res.render('login.handlebars', { error: 'Invalid username or password.' });
            }
            bcrypt.compare(password, user.password, (err, result) => {
                if(err || !result) {
                    console.error('Error comparing passwords:', err);
                    return res.render('login.handlebars', { error: 'Invalid username or password.' });
                }

            req.session.user = {
                id: user.id,
                username: user.username || user.userName,
                isAdmin: username === 'admin' // Mark user as admin if username is 'admin'
            };

            console.log("User logged in:", req.session.user);
            res.redirect('/'); // Redirect to home page or dashboard
            });//logout prossessing
        });
    });
});

//logout prossessing 
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {// destroy the session
        if (err) {
            console.log('Error destroying session:', err);
            res.redirect('/'); // Redirect to home page even if error occurs
        }else{
            console.log('loged out successfully.');
            res.redirect('/'); // Redirect to home page after logout
        }
    });
});
// raw data of persons
app.get('/rawpersons', function (req, res){
    db.all('SELECT * FROM Person', function (err, rowPerson) {
        if(err){
            console.log('Error: '+err)
            res.status(500).send('Internal Server Error')
        }
        else{
            console.log('Data found, sending back to the client...')
            res.send(rowPerson)
        }
    })
})

function hashPassword(pw, saltRounds) {
    bcrypt.hash(pw, saltRounds, function(err, hash) {
        if(err) {
            console.error('---> Error hashing password:', err);
        } 
        else {
            console.log('---> Hashed password:', hash);
        }
    });
}


app.listen(port, () => { // listen on the port 
    hashPassword('wdf#2025', 12); // hash the password 'wdf#2025' with 12 salt rounds
    console.log(`server up and running on http://localhost:${port}...`)
})