# Threadline - Comments Board

A responsive Express.js discussion board for creating, viewing, updating, and deleting comments. Its login, signup, and comments pages share a consistent Threadline design. The app uses EJS and supports in-memory fallback comment storage and MongoDB persistence.

## Features

- View all comments on the main board
- Responsive, consistent Threadline styling across account and comment pages
- Add a new comment with username and message
- Open a comment detail page
- Edit an existing comment
- Delete a comment
- Flash success/error messages after actions
- MongoDB-supported persistence with graceful fallback to local in-memory storage
- MongoDB-backed account registration and login with salted password hashing
- Signed, HTTP-only login cookies with logout support
- Email OTP password reset with expiring codes and one-time verification

## Tech Stack

- Node.js
- Express.js
- EJS templates
- MongoDB + Mongoose
- Method override for PATCH and DELETE requests

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

All `/comments` pages and actions require a signed-in account. Guests who open a comments URL are redirected to `/login`.

- `GET /` → redirects to `/login`
- `GET /signup` and `POST /signup` → create an account
- `GET /login` and `POST /login` → log in to an account
- `GET /forgot-password` and `POST /forgot-password` → request an email reset code
- `GET /verify-reset-code` and `POST /verify-reset-code` → verify the email code
- `GET /reset-password` and `POST /reset-password` → set a new password after verification
- `POST /logout` → clear the login cookie
- `GET /comments` → displays all comments
- `GET /comments/new` → form to create a new comment
- `POST /comments` → creates a new comment
- `GET /comments/:id` → shows comment details
- `GET /comments/:id/edit` → edit form
- `PATCH /comments/:id` → updates comment
- `DELETE /comments/:id` → deletes comment

## Environment Configuration

The app supports MongoDB through environment variables. If the database is not configured, it automatically falls back to the built-in in-memory comment list for local testing.

Create a private `.env.local` file in the project root for machine-specific configuration. `.env.local` is ignored by Git and is loaded before `.env`, so its values take priority:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/commentsdb
MONGODB_DB_NAME=commentsdb
AUTH_SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters-long
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-gmail-address@gmail.com
MAIL_PASS=your-new-google-app-password
MAIL_FROM=your-gmail-address@gmail.com
```

Set `AUTH_SESSION_SECRET` to a private random value of at least 32 characters before deploying. For example, generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Account creation, login, and password reset require a working MongoDB connection; passwords and reset codes are stored as salted scrypt hashes. For Gmail, use an App Password (not your regular account password) as `MAIL_PASS`; never commit real credentials. Since the previous App Password was shared in chat, revoke it and generate a new one before using email reset. Reset codes expire after 10 minutes, are limited to five attempts, and can only be resent once per minute. In development, if `AUTH_SESSION_SECRET` is omitted, sessions use a temporary process-only secret and will expire when the app restarts.

## Screenshots

![Comments board](./public/picture/Comments%20board.png)

![Create new comment form](./public/picture/Create%20new%20comment%20form.png)

![Comment details page](./public/picture/Comment%20details%20page.png)

![Edit comment form](./public/picture/Edit%20comment%20form.png)

## Notes

This project was designed to match the provided UI mockups for a simple REST-based comments board and works as a lightweight demonstration of CRUD operations in Express.js.
