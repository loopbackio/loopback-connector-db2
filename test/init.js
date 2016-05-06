// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-db2
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

module.exports = require('should');

var DataSource = require('loopback-datasource-juggler').DataSource;

var config = {
  username: process.env.DB2_USERNAME,
  password: process.env.DB2_PASSWORD,
  hostname: process.env.DB2_HOSTNAME || 'localhost',
  port: process.env.DB2_PORTNUM || 60000,
  database: process.env.DB2_DATABASE || 'testdb',
  schema: process.env.DB2_SCHEMA || 'STRONGLOOP',
  supportColumnStore: process.env.DB2_USECOLUMNSTORE || false,
  supportDashDB: process.env.DB2_SUPPORT_DASHDB || false,
  supportDB2z: process.env.DB2_USE_DB2Z || false,
};

global.config = config;

global.getDataSource = global.getSchema = function(options) {
  var db = new DataSource(require('../'), config);
  return db;
};

global.sinon = require('sinon');
