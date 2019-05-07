// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-connector-db2
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

/* eslint-env node, mocha */
process.env.NODE_ENV = 'test';

require('./init.js');
require('should');
var assert = require('assert');

var db, uniquePkIndex, properties, SimpleEmployee;

describe('autoupdate', function() {
  before(function(done) {
    db = global.getDataSource();
    properties = {
      name: {
        type: String,
      },
      age: {
        type: Number,
      },
    };
    SimpleEmployee = db.define('SimpleEmployee', properties);
    db.autoupdate(function(err) {
      assert(!err);
      db.connector.getTableStatus('SimpleEmployee',
        function(err, fields, indexes) {
          assert(!err);
          assert(fields);
          assert(indexes);
          uniquePkIndex = indexes[0].INDNAME;
          done();
        });
    });
  });

  after(function(done) {
    SimpleEmployee.destroyAll(done);
  });

  it('perform autoupdate and check pk index', function(done) {
    db.autoupdate('SimpleEmployee', function(err) {
      assert(!err);
      db.connector.getTableStatus('SimpleEmployee',
        function(err, fields, indexes) {
          assert(!err);
          assert(fields);
          assert(indexes);
          // a new unique name is generated upon creation of primary indexes
          assert.notEqual(uniquePkIndex, indexes[0].INDNAME);
          done();
        });
    });
  });
});
