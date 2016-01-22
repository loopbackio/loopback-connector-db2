module.exports = require('should');

var DataSource = require('loopback-datasource-juggler').DataSource;

var config = {
  username: process.env.DB2_USERNAME,
  password: process.env.DB2_PASSWORD,
  hostname: process.env.DB2_HOSTNAME,
  port: process.env.DB2_PORTNUM,
  database: process.env.DB2_DATABASE,
};

global.config = config;

global.getDataSource = global.getSchema = function(options) {
  var db = new DataSource(require('../'), config);
  return db;
};

global.sinon = require('sinon');
