//  recipes came from .... site 
// ChatGPT was used to genirate some text in the /about rout.

const express=require('express') //read the express library
const sqlite3=require('sqlite3')
const { engine }=require('express-handlebars') // Load the handelbars package for express

const port=8080 // define the port
const app=express() // create the express application

app.use(express.static('public'))

app.engine('handlebars', engine()) // initialaze the engine to be handelbars
app.set('view engine', 'handlebars') // set handelbars as the view engine
app.set('views', './views') // define the views directory to be ./views

const dbFile='myRecipes.db'//--db
db = new sqlite3.Database(dbFile)

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

app.get('/login', (req, res) => {
    res.render('login.handlebars')
})

app.get('/rawpersons', function (err, res){
    db.all('SELLECT * FROM Person', function (err, rowPerson) {
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


app.listen(port, () => { // listen on the port 
    console.log(`server up and running on http://localhost:${port}...`)
})