// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-db2
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

/* eslint-env node, mocha */
process.env.NODE_ENV = 'test';

require('./init.js');
require('should');
var assert = require('assert');
var Schema = require('loopback-datasource-juggler').Schema;

var db, UserData, NumberData, DateData;

describe('migrations', function() {
  before(function(done) {
    if (global.config.supportDB2z) {
      this.skip();
      return done();
    }

    db = global.getDataSource();

    UserData = db.define('UserData', {
      email: {type: String, null: false, index: true,
               db2: {columnName: 'email', dataType: 'VARCHAR',
                     dataLength: 512, nullable: true}},
      name: String,
      bio: Schema.Text,
      birthDate: Date,
      pendingPeriod: Number,
      createdByAdmin: Boolean},
      {indexes: {index0: {columns: 'email,createdByAdmin'}}}
    );

    NumberData = db.define('NumberData', {
      number: {type: Number, null: false, index: true, unsigned: true,
        dataType: 'DECIMAL', precision: 10, scale: 3},
      tinyInt: {type: Number, dataType: 'SMALLINT', display: 2},
      mediumInt: {type: Number, dataType: 'INTEGER', unsigned: true,
        required: true},
      floater: {type: Number, dataType: 'DECIMAL', precision: 16, scale: 7},
    });

    DateData = db.define('DateData', {
      dateTime: {type: Date, dataType: 'timestamp'},
      timestamp: {type: Date, dataType: 'timestamp'},
    });

    db.automigrate(['UserData', 'NumberData', 'DateData'], done);
  });

  it('should run migration', function(done) {
    db.automigrate(['UserData'], done);
  });

  it('UserData should have correct columns', function(done) {
    db.adapter.getTableStatus('UserData', function(err, fields, indexes) {
      if (err) {
        return done(err);
      } else {
        fields.should.be.eql([
          {
            COLNO: 0,
            DATALENGTH: 512,
            DATATYPE: 'VARCHAR',
            NAME: 'email',
            NULLS: 'N',
          },
          {
            COLNO: 1,
            DATALENGTH: 512,
            DATATYPE: 'VARCHAR',
            NAME: 'name',
            NULLS: 'Y',
          },
          {
            COLNO: 2,
            DATALENGTH: 4096,
            DATATYPE: 'VARCHAR',
            NAME: 'bio',
            NULLS: 'Y',
          },
          {
            COLNO: 3,
            DATALENGTH: 10,
            DATATYPE: 'TIMESTAMP',
            NAME: 'birthDate',
            NULLS: 'Y',
          },
          {
            COLNO: 4,
            DATALENGTH: 4,
            DATATYPE: 'INTEGER',
            NAME: 'pendingPeriod',
            NULLS: 'Y',
          },
          {
            COLNO: 5,
            DATALENGTH: 2,
            DATATYPE: 'SMALLINT',
            NAME: 'createdByAdmin',
            NULLS: 'Y',
          },
          {
            COLNO: 6,
            DATALENGTH: 4,
            DATATYPE: 'INTEGER',
            NAME: 'id',
            NULLS: 'N',
          },
        ]);
      }

      done();
    });
  });

  it('UserData should have correct indexes', function(done) {
    // Note: getIndexes truncates multi-key indexes to the first member.
    // Hence index1 is correct.
    db.adapter.getTableStatus('UserData', function(err, fields, indexes) {
      if (err) {
        return done(err);
      } else {
        indexes[0].COLNAMES.should.be.eql('+id');
        indexes[0].TABNAME.should.be.eql('UserData');
        indexes[0].TABSCHEMA.should.be.eql(global.config.schema);
        indexes[0].UNIQUERULE.should.be.eql('P');

        indexes[1].COLNAMES.should.be.eql('+email+createdByAdmin');
        indexes[1].TABNAME.should.be.eql('UserData');
        indexes[1].TABSCHEMA.should.be.eql(global.config.schema);
        indexes[1].UNIQUERULE.should.be.eql('D');
      }

      done();
    });
  });

  // it('StringData should have correct columns', function(done) {
  //   getFields('StringData', function(err, fields) {
  //     if (err)
  //       done();

  //     fields.should.be.eql({
  //       idString: { Field: 'idString',
  //         Type: 'varchar(255)',
  //         Null: 'NO',
  //         Key: 'PRI',
  //         Default: null,
  //         Extra: ''},
  //       smallString: { Field: 'smallString',
  //         Type: 'char(127)',
  //         Null: 'NO',
  //         Key: 'MUL',
  //         Default: null,
  //         Extra: '' },
  //       mediumString: { Field: 'mediumString',
  //         Type: 'varchar(255)',
  //         Null: 'NO',
  //         Key: '',
  //         Default: null,
  //         Extra: '' },
  //       tinyText: { Field: 'tinyText',
  //         Type: 'tinytext',
  //         Null: 'YES',
  //         Key: '',
  //         Default: null,
  //         Extra: '' },
  //       giantJSON: { Field: 'giantJSON',
  //         Type: 'longtext',
  //         Null: 'YES',
  //         Key: '',
  //         Default: null,
  //         Extra: '' },
  //       text: { Field: 'text',
  //         Type: 'varchar(1024)',
  //         Null: 'YES',
  //         Key: '',
  //         Default: null,
  //         Extra: '' },
  //     });
  //     done();
  //   });
  // });

  it('NumberData should have correct columns', function(done) {
    db.adapter.getTableStatus('NumberData', function(err, fields, indexes) {
      if (err) {
        return done(err);
      } else {
        fields.should.be.eql([
          {
            COLNO: 0,
            DATALENGTH: 10,
            DATATYPE: 'DECIMAL',
            NAME: 'number',
            NULLS: 'N',
          },
          {
            COLNO: 1,
            DATALENGTH: 2,
            DATATYPE: 'SMALLINT',
            NAME: 'tinyInt',
            NULLS: 'Y',
          },
          {
            COLNO: 2,
            DATALENGTH: 4,
            DATATYPE: 'INTEGER',
            NAME: 'mediumInt',
            NULLS: 'N',
          },
          {
            COLNO: 3,
            DATALENGTH: 16,
            DATATYPE: 'DECIMAL',
            NAME: 'floater',
            NULLS: 'Y',
          },
          {COLNO: 4,
            DATALENGTH: 4,
            DATATYPE: 'INTEGER',
            NAME: 'id',
            NULLS: 'N',
          },
        ]);
      }

      done();
    });
  });

  it('DateData should have correct columns', function(done) {
    db.adapter.getTableStatus('DateData', function(err, fields, indexes) {
      if (err) {
        return done(err);
      } else {
        fields.should.be.eql([
          {
            COLNO: 0,
            DATALENGTH: 10,
            DATATYPE: 'TIMESTAMP',
            NAME: 'dateTime',
            NULLS: 'Y',
          },
          {
            COLNO: 1,
            DATALENGTH: 10,
            DATATYPE: 'TIMESTAMP',
            NAME: 'timestamp',
            NULLS: 'Y',
          },
          {
            COLNO: 2,
            DATALENGTH: 4,
            DATATYPE: 'INTEGER',
            NAME: 'id',
            NULLS: 'N',
          },
        ]);
      }

      done();
    });
  });

  it('should autoupdate', function(done) {
    var userExists = function(cb) {
      query('SELECT * FROM ' + global.config.schema + '.\"UserData\"',
        function(err, res) {
          cb(!err && res[0].email === 'test@example.com');
        });
    };

    UserData.create({email: 'test@example.com'}, function(err, user) {
      if (err) {
        return done(err);
      } else {
        userExists(function(yep) {
          assert.ok(yep, 'User does not exist');
        });

        UserData.defineProperty('email', {type: String});
        UserData.defineProperty('name', {type: String,
          dataType: 'char', limit: 50});
        UserData.defineProperty('newProperty', {type: Number, unsigned: true,
          dataType: 'bigInt'});

        // UserData.defineProperty('pendingPeriod', false);
        // This will not work as expected.
        db.autoupdate(function(err) {
          if (err)
            return done(err);

          db.adapter.getTableStatus('UserData', function(err, fields, indexes) {
            if (err)
              return done(err);

            // change nullable for email
            assert.equal(fields[0].NULLS, 'N',
                         'Email does not allow null');

            // change type of name
            assert.equal(fields[1].DATATYPE, 'VARCHAR',
                         'Name is not char(50)');
            assert.equal(fields[1].DATALENGTH, 512, 'Length is not 512');

            // add new column
            assert.ok(fields[7].NAME, 'NEWPROPERTY',
                      'New column was not added');

            if (fields[7].NAME === 'NEWPROPERTY') {
              assert.equal(fields[7].DATATYPE, 'BIGINT',
                'New column type is not bigint(20) unsigned');
            }
            // drop column - will not happen.
            // assert.ok(!fields.pendingPeriod,
            // 'Did not drop column pendingPeriod');
            // user still exists
            userExists(function(yep) {
              assert.ok(yep, 'User does not exist');
              // done();
            });
          });
        });
      }

      if (done) done();
    });
  });

  it.skip('should check actuality of dataSource', function(done) {
    // 'drop column'
    UserData.dataSource.isActual(function(err, ok) {
      if (err)
        return done(err);

      // TODO: Need to validate columns/indexes to test actuality and return
      // appropriate values.
      // assert.ok(ok, 'dataSource is not actual (should be)');
      UserData.defineProperty('essay', {type: Schema.Text});
      // UserData.defineProperty('email', false); Can't undefine currently.
      UserData.dataSource.isActual(function(err, ok) {
        if (err)
          return done(err);

        assert.ok(!ok, 'dataSource is actual (shouldn\'t be)');
        return done();
      });
    });
  });

  it('should allow numbers with decimals', function(done) {
    NumberData.create({number: 1.1234567, tinyInt: 12345, mediumInt: -1234567,
      floater: 123456789.1234567}, function(err, obj) {
      assert.ok(!err);
      assert.ok(obj);
      NumberData.findById(obj.id, function(err, found) {
        if (err) {
          console.log(err);
        } else {
          assert.equal(found.number, 1.123);
          assert.equal(found.tinyInt, 12345);
          assert.equal(found.mediumInt, -1234567);
          assert.equal(found.floater, 123456789.1234567);
        }
        done();
      });
    });
  });

  it('should allow both kinds of date columns', function(done) {
    DateData.create({
      dateTime: new Date('Aug 9 1996 07:47:33 GMT'),
      timestamp: new Date('Sep 22 2007 17:12:22 GMT'),
    }, function(err, obj) {
      if (err) {
        done(err);
      } else {
        // assert.ok(!err);
        assert.ok(obj);
        DateData.findById(obj.id, function(err, found) {
          if (err) {
            done(err);
          } else {
            assert.equal(found.dateTime.toGMTString(),
              'Fri, 09 Aug 1996 07:47:33 GMT');
            assert.equal(found.timestamp.toGMTString(),
              'Sat, 22 Sep 2007 17:12:22 GMT');
          }
          done();
        });
      }
    });
  });

  it('should report errors for automigrate', function() {
    db.automigrate('XYZ', function(err) {
      assert(err);
    });
  });

  it('should report errors for autoupdate', function() {
    db.autoupdate('XYZ', function(err) {
      assert(err);
    });
  });

  it('should disconnect when done', function(done) {
    db.disconnect();
    done();
  });
});

var query = function(sql, cb) {
  db.adapter.execute(sql, cb);
};
