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

app.use(cookieParser())

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (Object.keys(req.cookies).length == 0) {
    req.hasCookies = false
    console.log("no cookies have been found")
  } else {
    req.hasCookies = true
    console.log(req.cookies)
  }
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
  if (!req.hasCookies) {
    console.log("delivering new cookie")
    res.cookie("id", cookieString())
  }
  res.render("home.ejs");
});

app.get("/deletecookies", (req, res) => {
  res.clearCookie("id");
  res.send("id cookie was deleted")
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
  let sendString = "<p>Username or password was incorrect. Please try again.</p><a href='/'>Go back to Homepage</a>";

  // check if password is correct for given username

  let checkPassword = await dbQuery("SELECT * FROM data WHERE username = $1", [
    userName,
  ]);

  // if checkPassword is empty, then no user with that username exists.

  if (checkPassword.length > 0) {
    if (bcrypt.compareSync(req.body.password, checkPassword[0].password)) {
      sendString = "<p>Login was successful!</p><a href='/'>Go back to Homepage</a>";
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
