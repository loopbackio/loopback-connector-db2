// Copyright IBM Corp. 2016,2020. All Rights Reserved.
// Node module: loopback-connector-db2
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

module.exports = require('should');

const Connector = require('../');
const juggler = require('loopback-datasource-juggler');
let DataSource = juggler.DataSource;

var config = {
  username: process.env.DB2_USERNAME || 'db2inst1',
  password: process.env.DB2_PASSWORD || 'password',
  hostname: process.env.DB2_HOSTNAME || 'localhost',
  port: process.env.DB2_PORTNUM || 50000,
  database: process.env.DB2_DATABASE || 'mydb',
  schema: process.env.DB2_SCHEMA || 'STRONGLOOP',
};

global.config = config;

let db;
global.getDataSource = global.getSchema = function(options) {
  db = new DataSource(Connector, global.config);
  db.log = function(a) {
    console.log(a);
  };
  return db;
};
clearTimeout(global.getDataSource);

global.resetDataSourceClass = function(ctor) {
  DataSource = ctor || juggler.DataSource;
  const promise = db ? db.disconnect() : Promise.resolve();
  db = undefined;
  return promise;
};

global.connectorCapabilities = {
  ilike: false,
  nilike: false,
};

global.sinon = require('sinon');
