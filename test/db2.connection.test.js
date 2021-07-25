// Copyright IBM Corp. 2016,2019. All Rights Reserved.
// Node module: loopback-connector-db2
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

/* eslint-env node, mocha */
process.env.NODE_ENV = 'test';
require('./init.js');
const assert = require('assert');
const DataSource = require('loopback-datasource-juggler').DataSource;

let config;

before(function() {
  config = global.config;
});

describe('testConnection', function() {
  it('should pass with valid settings', function(done) {
    const db = new DataSource(require('../'), config);
    db.ping(function(err) {
      assert(!err, 'Should connect without err.');
      done();
    });
  });

  it('should pass when valid DSN overrides empty settings', function(done) {
    const dsn = generateDSN(config);
    const dbConfig = {
      dsn: dsn,
    };

    const db = new DataSource(require('../'), dbConfig);
    db.ping(function(err) {
      assert(!err, 'Should connect without err.');
      done();
    });
  });

  it('should pass when valid DSN overrides invalid settings', function(done) {
    const dsn = generateDSN(config);
    const dbConfig = {
      dsn: dsn,
      host: 'invalid-hostname',
      port: 80,
      database: 'invalid-database',
      username: 'invalid-username',
      password: 'invalid-password',
    };

    const db = new DataSource(require('../'), dbConfig);
    db.ping(function(err) {
      assert(!err, 'Should connect without err.');
      done();
    });
  });
});

function generateDSN(config) {
  const dsn =
    'DRIVER={DB2}' +
    ';DATABASE=' + config.database +
    ';HOSTNAME=' + config.hostname +
    ';UID=' + config.username +
    ';PWD=' + config.password +
    ';PORT=' + config.port +
    ';PROTOCOL=TCPIP';
  return dsn;
}
