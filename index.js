import "dotenv/config";

import express from "express";
const app = express();
const port = process.env.PROJECT_PORT;
const appName = process.env.PROJECT_NAME;

import { Client } from 'pg'
const db = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})
await db.connect()

async function dbTransaction(query, data) {
    const result = await db.query(query, data)
    return result.rows
}

let aaa = await dbTransaction("SELECT * FROM data;", [])
console.log(aaa)

app.get("/", (req, res) => {
  res.send("hello world")
});

app.listen(port, () => {
  if (process.env.NODE_ENV === "production") {
    console.log("SMILE! you're in production");
  }
  console.log(`${appName} is listening on port ${port}`);
});
