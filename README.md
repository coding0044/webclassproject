<<<<<<< HEAD
# Threadline - Comments Board

A responsive Express.js discussion board for creating, viewing, updating, and deleting comments. Its login, signup, and comments pages share a consistent Threadline design. The app uses EJS and supports in-memory fallback comment storage and MongoDB persistence.
=======
REST Demo – Comments Board

A simple RESTful web application built with Node.js, Express.js, and EJS that allows users to create, view, edit, and delete comments. The application features a clean, user-friendly interface and supports both MongoDB persistence and in-memory storage for local development.
>>>>>>> dd9b947c3a1a8de8eedd0df4150d9569fcf0dba0

Features
View all comments on the main board.
Create new comments with a username and message.
View individual comment details.
Edit existing comments.
Delete comments.
Display success and error messages after user actions.
Store comments in MongoDB using Mongoose.
Automatically fall back to in-memory storage when MongoDB is unavailable or not configured.
Use HTTP PATCH and DELETE methods through method-override.
Tech Stack
Backend: Node.js and Express.js
Frontend: EJS templates, HTML, and CSS
Database: MongoDB and Mongoose
Middleware: Method Override and session-based flash messaging
Configuration: dotenv
Installation
Clone the repository:
git clone <repository-url>

<<<<<<< HEAD
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
=======
Navigate to the project directory:
cd <project-folder>
>>>>>>> dd9b947c3a1a8de8eedd0df4150d9569fcf0dba0

Install the dependencies:
npm install

Configuration

To enable MongoDB persistence, create a .env file in the project root:

<<<<<<< HEAD
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

If MongoDB Atlas SRV lookups fail with `querySrv ECONNREFUSED` on Windows, set `MONGODB_DNS_SERVERS` to comma-separated DNS resolver addresses reachable from your network. The application uses these addresses for MongoDB DNS lookups; omit the setting when the default resolver works.

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

### Vercel deployment

Add `AUTH_SESSION_SECRET`, `MONGODB_URI`, `MONGODB_DB_NAME`, and the required `MAIL_*` settings under **Vercel → Project → Settings → Environment Variables** for each deployment environment you use. Set `AUTH_SESSION_SECRET` to a stable random value of at least 32 characters; do not use a different value on each deployment. After saving environment variables, redeploy the project. The app still renders public login/signup pages if the session secret is missing, but account and password-reset actions return a configuration message instead of crashing the serverless function.

## Screenshots
=======
PORT=3000
MONGODB_URI=mongodb://localhost:27017/commentsdb
MONGODB_DB=commentsdb

>>>>>>> dd9b947c3a1a8de8eedd0df4150d9569fcf0dba0

Make sure MongoDB is running locally or replace MONGODB_URI with your database connection string.

If MongoDB is not configured or the connection cannot be established, the application can use its in-memory fallback storage, depending on the application's implementation.

Run the Application

Start the server using:

npm start


Open your browser and navigate to:

http://localhost:3000

Application Routes
HTTP Method	Endpoint	Description
GET	/	Redirects to the comments board
GET	/comments	Displays all comments
GET	/comments/new	Displays the new comment form
POST	/comments	Creates a new comment
GET	/comments/:id	Displays a comment's details
GET	/comments/:id/edit	Displays the edit form
PATCH	/comments/:id	Updates an existing comment
DELETE	/comments/:id	Deletes a comment
Screenshots
Comments Board

Displays all comments with options to view, edit, or delete them.

!Comments Board

Create New Comment

A form for entering a username and comment message.

!Create New Comment Form

Comment Details

Displays the details of an individual comment.

!Comment Details Page

Edit Comment

A form for updating an existing comment.

!Edit Comment Form

Project Structure

A typical project structure may look like this:

project-folder/
├── models/
├── public/
│   ├── css/
│   └── picture/
├── views/
│   └── comments/
├── .env
├── .gitignore
├── package.json
└── app.js


The exact structure may vary depending on your implementation.

Notes

This project demonstrates the fundamental principles of RESTful routing and CRUD operations using Express.js. It is designed to provide a simple, clean interface for managing comments while supporting MongoDB-backed persistence and an in-memory fallback for local testing.

Note: In-memory data is temporary and will be lost when the server restarts. MongoDB should be used when persistent storage is required.

License

Add a license here if you intend to distribute this project publicly.
