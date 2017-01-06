// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-db2
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

/* eslint-env node, mocha */
process.env.NODE_ENV = 'test';
var assert = require('assert');
require('./init.js');

// var DataSource = require('loopback-datasource-juggler').DataSource;
var db, config;

before(function() {
  db = global.getDataSource();
  config = global.config;
});

describe('discoverModels', function() {
  before(function() {
    if (global.config.supportDB2z) {
      this.skip();
    }
  });

  describe('Discover database schemas', function() {
    it('should return an array of db schemas', function(done) {
      db.connector.discoverDatabaseSchemas(function(err, schemas) {
        if (err) return done(err);
        schemas.should.be.an.instanceOf(Array);
        schemas.length.should.be.above(0);
        done();
      });
    });
  });

  describe('Discover models including views', function() {
    it('should return an array of tables and views',
      function(done) {
        db.discoverModelDefinitions({views: true, limit: 3},
          function(err, models) {
            if (err) {
              console.error(err);
              done(err);
            } else {
              var views = false;
              models.forEach(function(m) {
                // console.dir(m);
                if (m.type === 'view') {
                  views = true;
                }
              });
              assert(views, 'Should have views');
              done(null, models);
            }
          });
      });
  });

  describe('Discover current user\'s tables', function() {
    it('should return an array of tables for the current user',
      function(done) {
        db.discoverModelDefinitions({limit: 3},
          function(err, models) {
            if (err) {
              console.error(err);
              done(err);
            } else {
              models.forEach(function(m) {
                assert.equal(m.owner.toUpperCase(),
                             config.username.toUpperCase());
              });
              done(null, models);
            }
          });
      });
  });

  describe('Discover models excluding views', function() {
    it('should return an array of only tables', function(done) {
      db.discoverModelDefinitions({views: false, limit: 3},
        function(err, models) {
          if (err) {
            console.error(err);
            done(err);
          } else {
            var views = false;
            models.forEach(function(m) {
              // console.dir(m);
              if (m.type === 'view') {
                views = true;
              }
            });
            models.should.have.length(3);
            assert(!views, 'Should not have views');
            done(null, models);
          }
        });
    });
  });
});

describe('Discover models including other users', function() {
  before(function() {
    if (global.config.supportDB2z) {
      this.skip();
    }
  });

  it('should return an array of all tables and views', function(done) {
    db.discoverModelDefinitions({all: true, limit: 3},
      function(err, models) {
        if (err) {
          console.error(err);
          done(err);
        } else {
          var others = false;
          models.forEach(function(m) {
            // console.dir(m);
            if (m.owner !== config.schema) {
              others = true;
            }
          });
          assert(others, 'Should have tables/views owned by others');
          done(err, models);
        }
      });
  });
});

describe('Discover model properties', function() {
  before(function() {
    if (global.config.supportDB2z) {
      this.skip();
    }
  });

  describe('Discover a named model', function() {
    it('should return an array of columns for PRODUCT', function(done) {
      db.discoverModelProperties('PRODUCT', function(err, models) {
        if (err) {
          console.error(err);
          done(err);
        } else {
          models.forEach(function(m) {
            // console.dir(m);
            assert(m.tableName === 'PRODUCT');
          });
          done(null, models);
        }
      });
    });
  });
});

describe('Discover model primary keys', function() {
  before(function() {
    if (global.config.supportDB2z) {
      this.skip();
    }
  });

  it('should return an array of primary keys for PRODUCT', function(done) {
    db.discoverPrimaryKeys('PRODUCT', function(err, models) {
      if (err) {
        console.error(err);
        done(err);
      } else {
        models.forEach(function(m) {
          // console.dir(m);
          assert(m.tableName === 'PRODUCT');
        });
        done(null, models);
      }
    });
  });

  it('should return an array of primary keys for STRONGLOOP.PRODUCT',
    function(done) {
      db.discoverPrimaryKeys('PRODUCT',
        {owner: config.schema},
        function(err, models) {
          if (err) {
            console.error(err);
            done(err);
          } else {
            models.forEach(function(m) {
              // console.dir(m);
              assert(m.tableName === 'PRODUCT');
            });
            done(null, models);
          }
        });
    });
});

describe('Discover model foreign keys', function() {
  before(function() {
    if (global.config.supportDB2z) {
      this.skip();
    }
  });

  it('should return an array of foreign keys for INVENTORY',
    function(done) {
      db.discoverForeignKeys('INVENTORY', function(err, models) {
        if (err) {
          console.error(err);
          done(err);
        } else {
          models.forEach(function(m) {
            // console.dir(m);
            assert(m.fkTableName === 'INVENTORY');
          });
          done(null, models);
        }
      });
    });

  it('should return an array of foreign keys for STRONGLOOP.INVENTORY',
    function(done) {
      db.discoverForeignKeys('INVENTORY',
        {owner: config.schema},
        function(err, models) {
          if (err) {
            console.error(err);
            done(err);
          } else {
            models.forEach(function(m) {
              // console.dir(m);
              assert(m.fkTableName === 'INVENTORY');
            });
            done(null, models);
          }
        });
    });
});

describe('Discover LDL schema from a table', function() {
  before(function() {
    if (global.config.supportDB2z) {
      this.skip();
    }
  });

  it('should return an LDL schema for INVENTORY',
    function(done) {
      db.discoverSchema('INVENTORY', {owner: config.schema},
        function(err, schema) {
          if (err) {
            done();
          }

          assert(schema.name === 'Inventory');
          assert(schema.options.db2.schema === config.schema);
          assert(schema.options.db2.table === 'INVENTORY');
          assert(schema.properties.productId);
          assert(schema.properties.productId.required);
          assert(schema.properties.productId.type === 'String');
          assert(schema.properties.productId.db2.columnName === 'PRODUCT_ID');
          assert(schema.properties.locationId);
          assert(schema.properties.locationId.type === 'String');
          assert(schema.properties.locationId.db2.columnName === 'LOCATION_ID');
          assert(schema.properties.available);
          assert(schema.properties.available.required === false);
          assert(schema.properties.available.type === 'Number');
          assert(schema.properties.total);
          assert(schema.properties.total.type === 'Number');
          done(null, schema);
        });
    });
});

describe('Discover and build models', function() {
  before(function() {
    if (global.config.supportDB2z) {
      this.skip();
    }
  });

  it('should discover and build models',
    function(done) {
      db.discoverAndBuildModels('INVENTORY',
                                {owner: config.schema,
                                 visited: {},
                                 associations: true},
        function(err, models) {
          if (err) {
            done();
          }

          assert(models.Inventory,
                 'Inventory model should be discovered and built');
          var schema = models.Inventory.definition;
          assert(schema.settings.db2.schema === config.schema);
          assert(schema.settings.db2.table === 'INVENTORY');
          assert(schema.properties.productId);
          assert(schema.properties.productId.type === String);
          assert(schema.properties.productId.db2.columnName === 'PRODUCT_ID');
          assert(schema.properties.locationId);
          assert(schema.properties.locationId.type === String);
          assert(schema.properties.locationId.db2.columnName === 'LOCATION_ID');
          assert(schema.properties.available);
          assert(schema.properties.available.type === Number);
          assert(schema.properties.total);
          assert(schema.properties.total.type === Number);
          models.Inventory.findOne(function(err, inv) {
            assert(!err, 'error should not be reported');
            done();
          });
        });
    });
});
