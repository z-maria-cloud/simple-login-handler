# Login Handler

Lets an user create an account, log in and log out.

## Important notes

This project was created in order to showcase how password handling works **FOR LEARNING PURPOSES ONLY**. It's **essential** to use **secure tools like OAUTH** instead of writing login handlers from scratch.

## Features

### Create new users

- Users must provide a full name, username and password in order to create an account
- Cannot create new user if the chosen username is already taken

### Login

- Users must provide a valid username / password pair in order to login
- Users cannot login with the wrong password

### Edit data

- After having successfully logged in, users can change the full name and username
- Users cannot choose an username that is already in use

### Logout

- After an user logs out, it will be necessary to log in again in order to edit username and full name

## Configuration

Download the files and then run `npm install`.

### .env file

Create a `.env` file containing `PROJECT_NAME` and `PROJECT_PORT` before using.

Also make sure to create an SQL database somewhere. You will need to provide SQL access data in `.env`, by using `DB_USER` (database user username), `DB_PASSWORD` and `DB_NAME` (database name).

The database's table **must** be named `data`, and must contain the following columns:
- `name, varchar(80)`
- `username, varchar(80)`
- `password, varchar(1000)`
- `id, bigserial primary key`

Here's a sample configuration of the `.env` file:

```
PROJECT_PORT=3000
PROJECT_NAME="Login Handler"
DB_USER="databaseuser"
DB_PASSWORD="databasepassword"
DB_NAME="logindatabase"
```

## Usage

Two npm scripts are available:
- `npm run dev`
- `npm run production` to enable EJS caching