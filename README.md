p2p-rpc-stream
==============

Transport-agnostic RPC libraries utilizing node streams have already become [quite](http://andreypopp.github.io/stream-rpc/) [popular](https://github.com/dominictarr/rpc-stream). In my opinion, there is still a problem, though: What if I need to call methods from both ends? Create tow tcp servers? Ugly.

This little library provides RPC streams that you can use to do traditional client/server or to communicate between peers (both sides act as client & server).

```js
var rpc = require('p2p-rpc-stream')
  , net = require('net')


// This node both
// a server ...

var server = rpc.createServer({
  echo: function(msg, reply) {
    reply(null, msg)
  },
  hello: function(reply) {
    reply(null, 'hello.')
  }
})

net.createServer(function(sock) {
  var rpc_conn = server.createStream()
  
  // ... and a client
  // at the same time!
  var client = rpc.createClient(server.id) // we need to know our own server
  
  sock
    .pipe(client) // send requests into the other direction and check for replies
    .pipe(rpc_conn) // check for requests and reply to them
    .pipe(sock)
  
  client.request('hello', function(er, res) {
    if(er) throw er // will return a Timeout error after some 5secs
    console.log(res)
  })
}).listen(3000)
```

```js
var rpc = require('p2p-rpc-stream')
  , net = require('net')

var client = rpc.createClient()

var sock = net.connect({port: 3000}, function(sock) {
  client.pipe(sock).pipe(client)
})
```

## Install

`npm install p2p-rpc-stream`

### Todo

* allow custom request timeouts

## Legal
(c) 2013 by Marcel Klehr  
MIT License