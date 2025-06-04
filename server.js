const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

process.on('uncaughtException', (err) => {
  console.log('unhandled exceptions!! shutting down');
  console.log(err.name, err.message);
  process.exit(1);
});

const app = require('./app');

//console.log(process.env);
const DB = process.env.DATABASE.replace(
  '<DB-PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
mongoose.connect(DB).then(() => {
  console.log('db connection is successful');
});

//start up a server and make it listen to requests
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`the server started lesitining at port ${port}`);
});
process.on('unhandledRejection', (err) => {
  console.log('unhandled rejection!! shutting down');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
