import "dotenv/config";
import escape from "validator/lib/escape.js";
import crypto from "crypto";

function cookieString() {
  return crypto.randomBytes(16).toString("hex");
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

let activeSessions = {};

app.use(express.static('public'))
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// custom middleware that handles cookie / sessions logic

app.use((req, res, next) => {
  if (
    Object.keys(req.cookies).length == 0 ||
    !Object.keys(activeSessions).includes(req.cookies.id)
  ) {
    // if:
    // - has no cookie
    // - has a cookie that's not listed in active sessions
    // then give a new one immediately
    // also add newly created cookie to the active sessions object with status of "no login"
    let newCookie = cookieString();
    console.log(
      `no valid cookies have been found, delivering one (${newCookie}) right now. creating new session`
    );
    activeSessions[newCookie] = { loggedIn: false, userName: null };
    req.cookies.id = newCookie;
    res.cookie("id", newCookie);
  } else {
    // already has an id cookie, so dont give out a new one
    if (Object.keys(activeSessions[req.cookies.id]).length > 1) {
      // for some reason unknown to me,
      // i noticed a weird "_locals: [Object: null prototype] {}" appearing in active session objects.
      // i dont know what that is and why it appears, and i don't like it so im deleting it
      console.log("→→→ WARNING: weird '_locals' thing identified, deleting it");
      delete activeSessions[req.cookies.id]._locals;
    }
    console.log(req.cookies);
  }
  console.log("activeSessions:", activeSessions);
  next();
});

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

app.get("/", async (req, res) => {
  // if user is logged in then also provide full name and id
  let resData = JSON.parse(JSON.stringify(activeSessions[req.cookies.id]));
  if (resData.loggedIn) {
    let completeUserData = await dbQuery(
      "SELECT * FROM data WHERE username = $1",
      [resData.userName]
    );
    resData.fullName = completeUserData[0].name;
    resData.userId = completeUserData[0].id;
  }
  res.render("home.ejs", resData);
});

app.get("/logout", (req, res) => {
  // remove id cookie and delete active sessions entry
  let currentCookie = req.cookies.id;
  delete activeSessions[currentCookie];
  res.clearCookie("id");
  console.log(`deleted active session for cookie: ${currentCookie}`);
  res.redirect("/");
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
      "This username was already taken. Please try again.";
    userAlreadyExists = true;
  }

  if (!userAlreadyExists) {
    // if user doesnt exist then we can store everything to database
    let storeUser = await dbQuery(
      "INSERT INTO data (name, username, password) VALUES ($1, $2, $3)",
      [fullName, userName, hash]
    );
    sendString =
      "Registration was successful. Try logging in now!";
  }

  res.render("simple.ejs", {message: sendString});
});

app.post("/login", async (req, res) => {
  const userName = escape(req.body.username);
  const password = req.body.password;
  const currentCookie = req.cookies.id;
  let resData =
    "Username or password was incorrect. Please try again.";

  // check if password is correct for given username

  let checkPassword = await dbQuery("SELECT * FROM data WHERE username = $1", [
    userName,
  ]);

  // if checkPassword is empty, then no user with that username exists.
  if (checkPassword.length == 0) {
    console.log("no user was found");
    res.render("simple.ejs", {message: resData});
  }

  if (checkPassword.length > 0) {
    if (bcrypt.compareSync(password, checkPassword[0].password)) {
      console.log("check successful");
      // if login is successful, then we have to assign "true"
      // to the current request's cookie's login status in the active sessions object
      // and set the correct username.
      activeSessions[currentCookie] = { loggedIn: true, userName: userName };
      res.redirect("/");
    } else {
      // the passwords dont match
      console.log("passwords did not match");
      res.render("simple.ejs", {message: resData});
    }
  }
});

app.post("/edit-user", async (req, res) => {
  console.log(req.body);
  let userName = escape(req.body.username);
  let fullName = escape(req.body.name);
  let userId = req.body.userid;

  // handle name update

  let updateFullName = await dbQuery(
    "UPDATE data SET name = $1 WHERE id = $2;",
    [fullName, userId]
  );

  // handle username update
  // if the user wants to change the username, then we have to make sure that it is available to use

  let checkPassword = await dbQuery("SELECT * FROM data WHERE username = $1", [
    userName,
  ]);

  if (checkPassword.length == 0) {
    // if length is 0 then username is available to use
    console.log("username is available to use");
    let updateUsername = await dbQuery(
      "UPDATE data SET username = $1 WHERE id = $2;",
      [userName, userId]
    );
    res.redirect("/logout");
  } else {
    // username already exists. is it the same user that requested the change?
    // check ids
    if (checkPassword[0].id == userId) {
      // the correct user wants to change the username.
      console.log(
        "the correct user wants to change username",
        checkPassword[0].id,
        userId
      );
      let updateUsername = await dbQuery(
        "UPDATE data SET username = $1 WHERE id = $2;",
        [userName, userId]
      );
      res.redirect("/logout");
    } else {
      // cannot set new username cos it was already taken.
      console.log(
        "the WRONG user wants to change username",
        checkPassword[0].id,
        userId
      );
      res.render("simple.ejs", {message: "Username already taken. Please try again."});
    }
  }
});

app.listen(port, () => {
  if (process.env.NODE_ENV === "production") {
    console.log("SMILE! you're in production");
  }
  console.log(`${appName} is listening on port ${port}`);
});
