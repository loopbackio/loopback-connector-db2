// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-db2
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var describe = require('./describe');

/* eslint-env node, mocha */
process.env.NODE_ENV = 'test';

// Note: this test is commented out because it is causing segfault in CI.
// Make sure this will be uncommented when enabling the tests.
// describe('db2 imported features', function() {
//   before(function() {
//     require('./init.js');
//   });

//   require('loopback-datasource-juggler/test/common.batch.js');
//   require('loopback-datasource-juggler/test/include.test.js');
// });
