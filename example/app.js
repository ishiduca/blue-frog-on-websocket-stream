'use strict'
var path      = require('path')
var http      = require('http')
var websocket = require('websocket-stream')
var ecstatic  = require('ecstatic')(path.join(__dirname, 'static'))
var response  = require('blue-frog-core/response')
var router    = require('../')

var r = router()

r.add('echo', (req, done) => {
    process.nextTick(() => {
        done(response(req.id, req.params))
    })
})

r.add('broadcast', (req, done) => {
    process.nextTick(() => {
        done.broadcast(response(req.id, req.params))
    })
})

var app = http.createServer(ecstatic)

websocket.createServer({server: app}, stream => {
    stream.pipe(r.route()).pipe(stream)
})

var port = 9999

app.listen(port, () => console.log('on port "%d"', port))
