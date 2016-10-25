var through     = require('through2')
var rpc         = require('blue-frog-stream')
var response    = require('blue-frog-core/response')
var rpcError    = require('blue-frog-core/error')

module.exports = BlueFrog

function BlueFrog () {
    if (!(this instanceof BlueFrog)) return new BlueFrog()
    this.streams = []
    this.routes  = {}
}

BlueFrog.prototype.route = function () {
    var me = this

    return through(function (buf, _, done) {
        var isDone  = false
        var batch   = new rpc.response.BatchStream(true)

        batch
            .once('data', doEnd)
            .once('end', doEnd)
            .on('error', function (err) {
                console.error(err)
            })

        function doEnd (rpcResposeStr) {
            if (isDone) return
            isDone = true
            done(null, rpcResposeStr)
            this.push(null)
        }

        var data = String(buf)
        var rpcRequest; try {
            rpcRequest = JSON.parse(data)
        } catch (err) {
            return batch.end(getRpcParseError(err, data))
        }

        var ps    = []
        var parse = new rpc.request.ParseStream(rpcRequest)

        parse.on('error', function (err) {
            this.push(getRpcInvalidRequest(err))
        })
        .pipe(through.obj(function (req, _, done) {
            ps.push(new Promise(function (resolve) {
                if (req.error) return resolve(req) // invalidRequest
                var route = me.getRoute(req.method)
                if (! route) return resolve(getRpcMethodNotFound(req))

                function callback (data) {
                    resolve(data)
                }

                callback.broadcast = function (data) {
                    for (i = 0; i < me.streams.length; i++) {
                        me.streams[i].write(JSON.stringify(data))
                    }
                    callback()
                }

                route(req, callback)
            }))

            done()
        }, function (done) {
            Promise.all(ps).then(function (res) {
                for (var i = 0; i < res.length; i++) {
                    res[i] && this.push(res[i])
                }
                done()
                this.push(null)
            }.bind(this))
        }))
        .pipe(batch)
    })
    .on('pipe', function (stream) {
        me.streams = me.streams.concat(stream)
        stream.once('close', function () {
            stream.unpipe(this)
        }.bind(this))
    })
    .on('unpipe', function (stream) {
        this.unpipe(stream)
        me.streams = me.streams.filter(filter)
        function filter (s) { return s !== stream }
    })
}

function getRpcParseError (e, req) {
    var err = SyntaxError('JSON parse error: ' + e.message, e)
    err.data = req
    return response.error(null, rpcError.ParseError(err))
}
function getRpcInvalidRequest (err) {
    return response.error(err.id || null, rpcError.InvalidRequest(err))
}
function getRpcMethodNotFound (req) {
    var err = new Error('method "' + req.method + '" not found')
    err.data = req
    return response.error(req.id || null, rpcError.MethodNotFound(err))
}

BlueFrog.prototype.add = function (method, route) {
    return (this.routes[method] = route)
}

BlueFrog.prototype.getRoute = function (method) {
    return this.routes[method]
}
