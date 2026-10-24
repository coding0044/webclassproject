REST Demo – Comments Board

A simple RESTful web application built with Node.js, Express.js, and EJS that allows users to create, view, edit, and delete comments. The application features a clean, user-friendly interface and supports both MongoDB persistence and in-memory storage for local development.

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

Navigate to the project directory:
cd <project-folder>

Install the dependencies:
npm install

Configuration

To enable MongoDB persistence, create a .env file in the project root:

PORT=3000
MONGODB_URI=mongodb://localhost:27017/commentsdb
MONGODB_DB=commentsdb


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
