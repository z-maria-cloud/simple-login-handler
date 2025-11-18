import "dotenv/config";
import escape from "validator/lib/escape.js";
import crypto from "crypto";

function cookieString() {
  return crypto.randomBytes(16).toString("hex")
}

// bcrypt init + basic test

import bcrypt from "bcrypt";
const saltRounds = 10;

// express init

import express from "express";
import cookieParser from "cookie-parser";
const app = express();
const port = process.env.PROJECT_PORT;
const appName = process.env.PROJECT_NAME;

// this active sessions object will keep track of all the cookies that were distributed, along with that user's current status

let activeSessions = {}

app.use(cookieParser())

app.use(express.urlencoded({ extended: true }));

// custom middleware that handles cookie / sessions logic

app.use((req, res, next) => {
  if (Object.keys(req.cookies).length == 0 || !Object.keys(activeSessions).includes(req.cookies.id)) {
    // if:
    // - has no cookie
    // - has a cookie that's not listed in active sessions
    // then give a new one immediately
    // also add newly created cookie to the active sessions object with status of "no login"
    let newCookie = cookieString()
    console.log(`no valid cookies have been found, delivering one (${newCookie}) right now. creating new session`)
    activeSessions[newCookie] = {loggedIn: false, userName: null}
    req.cookies.id = newCookie
    res.cookie("id", newCookie)
  } else {
    // already has an id cookie, so dont give out a new one
    if (Object.keys(activeSessions[req.cookies.id]).length > 1) {
      // for some reason unknown to me,
      // i noticed a weird "_locals: [Object: null prototype] {}" appearing in active session objects.
      // i dont know what that is and why it appears, and i don't like it so im deleting it
      console.log("→→→ WARNING: weird '_locals' thing identified, deleting it")
      delete activeSessions[req.cookies.id]._locals
    }
    console.log(req.cookies)
  }
  console.log("activeSessions:",activeSessions)
  next()
})

// db connection init

import { Client } from "pg";
const db = new Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  await db.connect();
} catch (error) {
  console.log(error);
  console.log("could not connect to database.");
}

// simple dbquery function

async function dbQuery(query, data) {
  const result = await db.query(query, data);
  return result.rows;
}

app.get("/", (req, res) => {
  let resData = activeSessions[req.cookies.id]
  res.render("home.ejs", resData);
});

app.get("/logout", (req, res) => {
  let currentCookie = req.cookies.id
  delete activeSessions[currentCookie]
  res.clearCookie("id");
  console.log(`deleted active session for cookie: ${currentCookie}`)
  res.send("<p>Successfully logged out.</p><a href='/'>Go back to Homepage</a>")
});

app.get("/new-user", (req, res) => {
  res.render("register.ejs");
});

app.get("/user-login", (req, res) => {
  res.render("login.ejs");
});

app.post("/register", async (req, res) => {
  // hash password
  const fullName = escape(req.body.name);
  const userName = escape(req.body.username);
  const hash = bcrypt.hashSync(req.body.password, saltRounds);
  let sendString;

  // check if username already exists in database
  // if so, the username is already taken.
  // the user must register again, choosing another username.

  let checkUsername = await dbQuery("SELECT * FROM data WHERE username = $1", [
    userName,
  ]);

  let userAlreadyExists;
  if (checkUsername.length > 0) {
    // some rows were returned from database;
    // user already exists
    sendString =
      "<p>This username was already taken. Please try again.</p><a href='/'>Go back to Homepage</a>";
    userAlreadyExists = true;
  }

  if (!userAlreadyExists) {
    // if user doesnt exist then we can store everything to database
    let storeUser = await dbQuery(
      "INSERT INTO data (name, username, password) VALUES ($1, $2, $3)",
      [fullName, userName, hash]
    );
    sendString =
      "<p>Registration was successful. Try logging in now!</p><a href='/'>Go back to Homepage</a>";
  }

  res.send(sendString);
});

app.post("/login", async (req, res) => {
  const userName = escape(req.body.username);
  const password = req.body.password;
  const currentCookie = req.cookies.id
  let sendString = "<p>Username or password was incorrect. Please try again.</p><a href='/'>Go back to Homepage</a>";

  // check if password is correct for given username

  let checkPassword = await dbQuery("SELECT * FROM data WHERE username = $1", [
    userName,
  ]);

  // if checkPassword is empty, then no user with that username exists.

  if (checkPassword.length > 0) {
    if (bcrypt.compareSync(password, checkPassword[0].password)) {
      // if login is successful, then we have to assign "true"
      // to the current request's cookie's login status in the active sessions object
      // and set the correct username.
      sendString = "<p>Login was successful!</p><a href='/'>Go back to Homepage</a>";
      activeSessions[currentCookie] = {loggedIn: true, userName: userName}
    }
  }

  res.send(sendString);
});

app.listen(port, () => {
  if (process.env.NODE_ENV === "production") {
    console.log("SMILE! you're in production");
  }
  console.log(`${appName} is listening on port ${port}`);
});
