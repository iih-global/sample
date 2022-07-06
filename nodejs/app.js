const express = require("express");
require('express-async-errors');
require('dotenv').config();

const bodyParser = require("body-parser");
const validate = require('express-validation')
var cors = require('cors')
const halper = require('./halpers/index');
require('./controllers/DBbackup');

const rateLimit = require("express-rate-limit");

const postRoutes = require('./routes/post.route');

const port = process.env.SITEPORT;
const host = process.env.SITEHOST || 'localhost';
const app = express();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cors());
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    next();
});

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200
});

var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
const jwt = require('jsonwebtoken');
var cors = require('cors');

app.use(cors());

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Credentials', true);
    next();
});

app.use(limiter);

const userSocketIdMap = new Map(); 
app.io = io;
var socketNode = {};
io.use((socket, next) => {
 const token = socket.handshake.query.token;
 let decoded = jwt.decode(token, {complete: true});
 
 
 // verify token
 if(token){
  if(decoded){
    let user_ids = decoded.payload.id;
    jwt.verify(token, process.env.JWT_PRIVATE_KEY, function(err, decoded) {
      if(decoded !== undefined){
        app.user_ids = user_ids;
        socket.join("usersocket"+user_ids);
        socketNode[socket.id] = user_ids;
        socket.join(socket.id)
        app.socket = socket;

        addClientToMap(user_ids, socket.id);
        next();  
      }else{
        next(new Error('Unauthenticated'));
      }
    });
  }else{
    next(new Error('Unauthenticated'));
   }
 }else{
  next(new Error('Unauthenticated'));
 }
});


io.on('connection', (socket) => {
  console.log("connection", socketNode, userSocketIdMap);
  //socket.broadcast.emit("like",{"post_id":1});
    app.socket = socket;
    const token = socket.handshake.query.token;
    jwt.verify(token, process.env.JWT_PRIVATE_KEY, function(err, decoded) {
      if(decoded !== undefined){
        updateLiveUsers();
      }else{
        next(new Error('Unauthenticated'));
      }
    });
    
    
    let disconnectSocket = socket;
   socket.on('disconnect', function () {
    let decoded = jwt.decode(token, {complete: true});
    let user_ids = decoded.payload.id;
      removeClientFromMap(user_ids, socket.id);
      //console.log('user disconnected:' , userSocketIdMap)
      delete socketNode[socket.id];
      console.log(socket.id, 'disconnected')
      //if(!socket.nickname) return;
      //socketNode[user_ids]['status'] = false; //We dont splie nickname from array but change online state to false
      updateLiveUsers();
    });

    socket.on('chat message', (recipientUserName, messageContent) => {
      //get all clients (socketIds) of recipient
      let recipientSocketIds = userSocketIdMap.get( recipientUserName);
      for (let socketId of recipientSocketIds) {
        io.to(socketID).emit('new message', messageContent);
      }
    });
})

app.use('/post',postRoutes)

app.use(express.static('public'));
app.use('/public', express.static('public'));

// app.listen(port, host);
server.listen(port, host);
console.log('Magic happens on port ' + port);

function addClientToMap(userName, socketId){
  console.log("addClientToMap", userName, socketId);
  if (!userSocketIdMap.has(userName)) {
    //when user is joining first time
    userSocketIdMap.set(userName, new Set([socketId]));
    io.sockets.emit('live_users', {user_id:halper.makeEncr(userName), status:'online'});
  } else{
    //user had already joined from one client and now joining using another client
    userSocketIdMap.get(userName).add(socketId);
  }
  addSocketid({user_id:userName,socket_id:socketId });
  app.userSocketIdMap = userSocketIdMap;
}


function removeClientFromMap(userName, socketId){
  console.log("removeClientFromMap", userName, socketId);
  if (userSocketIdMap.has(userName)) {
    let userSocketIdSet = userSocketIdMap.get(userName);
    userSocketIdSet.delete(socketId);
    //if there are no clients for a user, remove that user from online
    //list (map)
    if (userSocketIdSet.size ==0 ) {
      userSocketIdMap.delete(userName);
      removeAllSocketUser(userName);
      io.sockets.emit('live_users', {user_id:halper.makeEncr(userName), status:'offline'});
    }
    removeSocketid({user_id:userName,socket_id:socketId });
    app.userSocketIdMap = userSocketIdMap;
  }
}


function updateLiveUsers(){
    let keys = Array.from(userSocketIdMap.keys() );
    // console.log(userSocketIdMap, "updateLiveUsers", keys);
    removeAllSocketUserOffline(keys);
    //io.sockets.emit('usernames', socketNode);
    //io.sockets.emit('live_users', keys);
}
console.log("userSocketIdMap from APP", userSocketIdMap)