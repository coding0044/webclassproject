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

## Screenshots

![Comments board](file:///C:/Users/SP24-BSCS-0044.JINNAH/AppData/Roaming/Code/agentSessionData/0c3c410a-5b9f-449d-8c69-7064437aa0c5/attachments/9231c3ef-7645-4b7a-89b1-1da298e0c745/Pasted%20Image.png)

![Create new comment form](file:///C:/Users/SP24-BSCS-0044.JINNAH/AppData/Roaming/Code/agentSessionData/0c3c410a-5b9f-449d-8c69-7064437aa0c5/attachments/40142d3c-e88c-437b-8087-b58deb6d2e32/Pasted%20Image%202.png)

![Comment details page](file:///C:/Users/SP24-BSCS-0044.JINNAH/AppData/Roaming/Code/agentSessionData/0c3c410a-5b9f-449d-8c69-7064437aa0c5/attachments/c29f813c-4852-43ee-8fdd-64353db6ff1c/Pasted%20Image%203.png)

![Edit comment form](file:///C:/Users/SP24-BSCS-0044.JINNAH/AppData/Roaming/Code/agentSessionData/0c3c410a-5b9f-449d-8c69-7064437aa0c5/attachments/f134309f-217a-4279-b6db-0200b3e67ef5/Pasted%20Image%204.png)

## Notes

This project was designed to match the provided UI mockups for a simple REST-based comments board and works as a lightweight demonstration of CRUD operations in Express.js.
