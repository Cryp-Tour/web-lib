
// Importing express for the webserver and serve-static to make serving static files easier
var express = require('express')
var serveStatic = require('serve-static')
var path = require('path');

// create a express instance
var _app = express()

// Hold configuration for the port the webserver should be reached at
var _config = {
    webInterface: { port: 8080 }
}

_app.get("/cryptour-web-lib.js", (req, res) => {
    res.contentType("text/javascript");
    res.sendFile(path.join(__dirname, "../src/cryptour-web-lib.js"));
})
_app.use(serveStatic('./wwwroot'))
_app.use(serveStatic('../../contracts/build'))
_app.listen(_config.webInterface.port, () => {
    console.log("[webInterface] Server running on " + _config.webInterface.port + " ...")
})