var through = require('through')
  , JSONstream = require('json-stream')

module.exports.createClient = function createClient(serverId) {
  var jsonStr = new JSONstream
  
  var clientStream = through(function(chunk) { // just a wrapper
    jsonStr.write(chunk)
  })
  
  var client = new Client(clientStream, serverId)
  clientStream.client = client

  clientStream.request = function() {
    return client.request.apply(client, arguments)
  }
  
  var respStream = through( // the actual stream
    function(obj) { // on write
      client.handleResponse(respStream, obj)
    }
  )

  jsonStr
   .pipe(respStream) // split the json gibberish into objects before handling them
   .on('data', function(c) {
     setImmediate(function() {
       clientStream.emit('data', c)
     })
   })

  return clientStream
}

function Client(stream, serverId) {
  this.stream = stream
  this.serverId = serverId
  this.c = 1
  this.cbs = {}
}

Client.prototype.handleResponse = function(stream, res) {
  if(!res.respondsTo || !this.cbs[res.respondsTo] || !res.result || res.origin == this.serverId)
      return stream.emit('data', JSON.stringify(res)+'\n') // simply pass through non-responses
  
  var cbEntry = this.cbs[res.respondsTo]
  delete this.cbs[res.respondsTo]

  clearTimeout(cbEntry.timeout)
  cbEntry.cb.apply(this, Array.isArray(res.result)? res.result : [])
}

Client.prototype.request = function(/*method, args.., cb*/) {
  var client = this

  var args = Array.prototype.slice.apply(arguments)
    , method = args.shift()
    , cb = args.pop()
  
  var id = this.c++
  
  if(this.c > 1E81) this.c = 0 // For sanity, you know.
  
  this.cbs[id] = {
    cb: cb
  , timeout: setTimeout(function() {
      delete client.cbs[id]
      cb(new Error('Timeout.'))
    }, 5*1000)
  }
  this.stream.emit('data', JSON.stringify({id: id, method: method, args: args, origin: client.serverId})+'\n')
}



module.exports.createServer = function createActor(methods) {
  return new Actor(methods)
}

function Actor(methods) {
  this.id = (Math.random()*1E10).toString(36)+(Math.random()*1E10).toString(36)
  this.methods = methods
}

Actor.prototype.createStream = function() {
  var actor = this

  var jsonStr = new JSONstream
  
  var reqStream = through(
    function(obj) { // on write
      actor.handleRequest(reqStream, obj)
    }
  )
  
  var actStream = through(function(chunk) {
    jsonStr.write(chunk)
  })

  jsonStr
   .pipe(reqStream) // split the json gibberish into objects before handling them
   .on('data', function(c) {actStream.emit('data', c)})

  return actStream
}

Actor.prototype.handleRequest = function(stream, req) {
  var actor = this
  if(!req.id || !req.method || !this.methods[req.method] || req.origin == this.id)
    return stream.emit('data', JSON.stringify(req)+'\n') // simply pass through non-requests

  var args = [cb]
  this.methods[req.method].apply(this, Array.isArray(req.args)? req.args.concat(args) : args)
  
  function cb(er, res) {
    stream.emit('data', JSON.stringify({respondsTo: req.id, result: [er, res], origin: actor.id})+'\n')
  }
}

Actor.prototype.handle = function(method, fn) {
  this.methods[method] = fn
}