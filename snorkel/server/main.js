"use strict";

// vendor
var express = require('express');
var http = require('http');
var app = express();
// setup helpers
var globals = require("./globals");
globals.install();

var config = require("./config");


// setup() fills these in
var socket,
    http_server,
    https_server;


function setup() {
  if (config.behind_proxy) {
    app.enable('trust proxy');
  }

  socket = require_root("server/socket");

  http_server = http.createServer(app);

  // Setup an HTTPS server
  var auth = require_root("server/auth");
  https_server = auth.setup_ssl_server(app);

  http.globalAgent.maxSockets = config.max_http_sockets;

  // Authorization
  var passport = require('passport');


  // Better stack traces
  require("longjohn");

  // Add timestamps
  require("./console").install();

  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

  // Setup authentication
  app.use(express.cookieParser());

  var session = require("./session");
  session.install(app);
  app.use(passport.initialize());
  app.use(passport.session());


  // parse POST request body bits
  app.use(express.bodyParser());


  //app.use(express.logger());
  app.use(express.compress());


  // setup static helpers
  app.use(express.static('static'));

  // setup error handling
  //var errorHandlers = require_root("server/error_handlers");
  //app.use(errorHandlers.default);

  // lib
  var routes = require('./routes');
  routes.setup(app);
}

function setup_services(options) {
  setup();
  if (options.collector) {
    require_root("controllers/data/server").setup_collector();
  }
}

module.exports = {
  run: function() {
    var services = { web_server: true };
    if (!config.separate_services) { services.collector = true; }
    setup_services(services);

    var http_port = config.http_port;
    var https_port = config.https_port;
    socket.setup_io(app, http_server);
    http_server.listen(http_port);

    console.log("Listening for HTTP connections on port", http_port);

    // Setting up SSL server
    if (https_server && https_port) {
      console.log("Listening for HTTPS connections on port", https_port);
      socket.setup_io(app, https_server);
      https_server.listen(https_port);
    }
    // End SSL Server
  },

  run_collector: function() {
    setup_services({
      collector: true
    });
  }
};
