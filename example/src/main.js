'use strict'
var through     = require('through2')
var rpc         = require('blue-frog-stream')
var request     = require('blue-frog-core/request')
var websocket   = require('websocket-stream')
var uri         = 'ws://' + location.hostname + ':' + location.port

window.onload = test


function test () {
    var ws  = websocket(uri)

    ws.once('close', function () {
        console.log('ws.closed')
    })
    ws.once('end', function () {
        console.log('ws.ended')
    })
    ws.once('finish', function () {
        console.log('ws.finished')
    })
    ws.once('pipe', function (batch) {
        console.log('batch.pipe(ws)')
    })
    ws.once('unpipe', function (batch) {
        console.log('batch.unpipe(ws)')
    })

    ws.once('connect', function () {
        console.log('ws.connected')
        createBatch(ws).end(request('connected', 'echo', {message: 'ws.connect ' + uri}))
    })

    setTimeout(function () {
        var b = createBatch(ws)
        b.write(request('1000.echo.1', 'echo', {message: 'test 1'}))
        b.write(request('1000.broadcast.2', 'broadcast', {message: 'test 2'}))
        b.end(request('1000.echo.3', 'echo', {message: 'test 3'}))
    }, 1000)
    setTimeout(function () {
        var b = createBatch(ws)
        b.write(request('2000.methodNotFound', 'method.not.found', {message: 'test 1'}))
        b.end(request('2000.broadcast.4', 'broadcast', {message: 'test 2'}))
    }, 2000)
    setTimeout(function () {
        var b = createBatch(ws)
        b.write(request('3000.broadcast.1', 'broadcast', {message: 'test 1'}))
        b.write(request('3000.echo.2', 'echo', {message: 'test 2'}))
        b.end(request('3000.broadcast.3', 'broadcast', {message: 'test 3'}))
    }, 3000)

    ws.pipe(through(function (buf, _, done) {
        var data = String(buf)
        var rpcResponse; try {
            rpcResponse = JSON.parse(data)
        } catch (err) {
            console.error(err)
            return done()
        }

        var parse = new rpc.response.ParseStream(rpcResponse)

        parse.on('error', function (err) {
            console.log(err)
        })
        parse.once('end', function () {
            console.log('parse.ended')
        })

        parse.pipe(through.obj(function (res, _, done) {
            console.log(res)
            done()
        }))

        done()
    }))
}

function createBatch (ws) {
    var batch = new rpc.request.BatchStream(true)

    batch.pipe(ws, {end: false})

    batch.on('finish', function () {
        console.log('batch.finished')
    })
    batch.on('end', function () {
        console.log('batch.ended')
        batch.unpipe(ws)
    })

    return batch
}
