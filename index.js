import "dotenv/config";
const { scryptSync } = await import('node:crypto');

// bcrypt init + basic test

import bcrypt from "bcrypt";
const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rD';
const someOtherPlaintextPassword = 'not_bacon';

const hash = bcrypt.hashSync(myPlaintextPassword, saltRounds);
console.log(hash)
console.log(bcrypt.compareSync(myPlaintextPassword, hash)); // true
console.log(bcrypt.compareSync(someOtherPlaintextPassword, hash)); // false

// express init

import express from "express";
const app = express();
const port = process.env.PROJECT_PORT;
const appName = process.env.PROJECT_NAME;

app.use(express.urlencoded({ extended: true }))

// db connection init

import { Client } from 'pg'
const db = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})

try {
  await db.connect()
} catch(error) {
  console.log(error)
  console.log("could not connect to database.")
}

// simple dbquery function

async function dbQuery(query, data) {
    const result = await db.query(query, data)
    return result.rows
}

let aaa = await dbQuery("SELECT * FROM data;", [])
console.log(aaa)

app.get("/", (req, res) => {
  res.render("register.ejs")
});

app.post("/register", (req, res) => {
  console.log(req.body)
  res.redirect("/")
});

app.listen(port, () => {
  if (process.env.NODE_ENV === "production") {
    console.log("SMILE! you're in production");
  }
  console.log(`${appName} is listening on port ${port}`);
});
