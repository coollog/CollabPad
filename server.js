var app = require('express')();
var http = require('http').Server(app);
var path = require('path');
var io = require('./io');

function absolutePathTo(file) {
  return path.join(__dirname, file);
}

app.get('/', function(req, res){
  res.sendFile(absolutePathTo('index.html'));
});

io.start(http);

http.listen(3000, function(){
  console.log('listening on *:3000');
});