import "dotenv/config";
import escape from 'validator/lib/escape.js';

// bcrypt init + basic test

import bcrypt from "bcrypt";
const saltRounds = 10;

//console.log(bcrypt.compareSync(myPlaintextPassword, hash));

// express init

import express from "express";
const app = express();
const port = process.env.PROJECT_PORT;
const appName = process.env.PROJECT_NAME;

app.use(express.urlencoded({ extended: true }));

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
  res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  // hash password
  const fullName = escape(req.body.name)
  const userName = escape(req.body.username)
  const hash = bcrypt.hashSync(req.body.password, saltRounds);

  // check if username already exists in database
  // if so, the username is already taken.
  // the user must register again, choosing another username.

  /*
  let checkUsername = await dbQuery(
    "SELECT * FROM data WHERE username = $1",
    [userName]
  );

  console.log(checkUsername)
  */

  let storeUser = await dbQuery(
    "INSERT INTO data (name, username, password) VALUES ($1, $2, $3)",
    [fullName, userName, hash]
  );
  res.send(
    "<p>Registration was successful. Try logging in now!</p><a href='/'>Go back to Homepage</a>"
  );
});

app.listen(port, () => {
  if (process.env.NODE_ENV === "production") {
    console.log("SMILE! you're in production");
  }
  console.log(`${appName} is listening on port ${port}`);
});
