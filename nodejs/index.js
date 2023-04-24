// Load env variables
require("dotenv").config();
require("./helpers/customError");

// connect redis
require("./helpers/redis");

// connect mysql database
const { sequelize } = require("./configs/mysql");

// Express App
const express = require("express");
const app = express();

// Initialize Middlewares
app.use(express.json()); // parse JSON data in request body
app.use(express.urlencoded({ extended: true })); // parse URL-encoded data in request body

// template engine configuration
app.set("view engine", "ejs");

// cors configurations
const cors = require("cors");
app.use(
  cors({
    origin: ["http://localhost:3000"], // Add your front-end origins
  })
);

// morgan configurations to print api request logs
const morgan = require("morgan");
// Print api request log into terminal.
// here we are used dev format to print logs into terminal because it's print quick overview about user request with colorful output
app.use(morgan("dev"));

// Socket io configurations
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: ["http://localhost:3000"], // cors origin configuration
  },
});
global.io = io;
// Import socket file
require("./helpers/socket");

// Variables
const PORT = process.env.PORT;

// import routes
app.use("/api", require("./routes"));

// Default route
app.get("/", (req, res) => {
  res.status(200).send(`<h1>Welcome to node-express-starter project</h1>`);
});

// common middleware to handle all errors
app.use((err, req, res, next) => {
  console.log("errorHandler Error", err);
  res.status(err?.statusCode || 500).json({
    status: false,
    message: err?.message || `Something went wrong! Please try after sometime.`,
  });
});

// Start server to listen user request on your port
server.listen(PORT, () => {
  console.log(
    `Server is start listing on port: ${PORT}. Visit http://localhost:${PORT}`
  );
});

// Connect MySQL database
sequelize
  .sync()
  .then(() =>
    console.log("MySQL database connection has been established successfully.")
  )
  .catch((reason) =>
    console.log("Unable to connect to the MySQL database:", reason)
  );
