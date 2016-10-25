# blue-frog-on-websocket-stream

an implementation example of using a blue-frog-stream on websocket-stream

## example

```js
var path      = require('path')
var http      = require('http')
var websocket = require('websocket-stream')
var ecstatic  = require('ecstatic')(path.join(__dirname, 'static'))
var response  = require('blue-frog-core/response')
var router    = require('blue-frog-on-websocket-stream')

var r = router()

r.add('echo', (req, write) => {
    process.nextTick(() => {
        write(response(req.id, req.params))
    })
})

r.add('broadcast', (req, write) => {
    process.nextTick(() => {
        write.broadcast(response(req.id, req.params))
    })
})

var app = http.createServer(ecstatic)

websocket.createServer({server: app}, stream => {
    stream.pipe(r.route()).pipe(stream)
})

var port = 9999

app.listen(port, () => console.log('on port "%d"', port))
```
