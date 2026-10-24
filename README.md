# REST Demo - Comments Board

A simple Express.js application for creating, viewing, updating, and deleting comments. The app includes a clean EJS-based UI and supports both in-memory fallback storage and MongoDB when configured.

## Features

- View all comments on the main board
- Add a new comment with username and message
- Open a comment detail page
- Edit an existing comment
- Delete a comment
- Flash success/error messages after actions
- MongoDB-supported persistence with graceful fallback to local in-memory storage

## Tech Stack

- Node.js
- Express.js
- EJS templates
- MongoDB + Mongoose
- Method override for PATCH and DELETE requests

## Project Structure

```text
.
├── config/
│   └── db.js
├── models/
│   └── Comment.js
├── public/
│   └── styles.css
├── tests/
│   └── app.test.js
├── views/
│   └── comments/
│       ├── edit.ejs
│       ├── index.ejs
│       ├── new.ejs
│       └── show.ejs
├── index.js
├── package.json
└── README.md
```

## Installation

1. Clone the repository
2. Open the project folder
3. Install dependencies:

```bash
npm install
```

## Run the app

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

## Routes

- `GET /` → redirects to `/comments`
- `GET /comments` → displays all comments
- `GET /comments/new` → form to create a new comment
- `POST /comments` → creates a new comment
- `GET /comments/:id` → shows comment details
- `GET /comments/:id/edit` → edit form
- `PATCH /comments/:id` → updates comment
- `DELETE /comments/:id` → deletes comment

## Environment Configuration

The app supports MongoDB through environment variables. If the database is not configured, it automatically falls back to the built-in in-memory comment list for local testing.

Create a `.env` file in the project root if needed:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/commentsdb
MONGODB_DB=commentsdb
```

## Notes

This project was designed to match the provided UI mockups for a simple REST-based comments board and works as a lightweight demonstration of CRUD operations in Express.js.
