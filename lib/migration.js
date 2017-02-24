// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-db2
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

/*!
 * DB2 connector for LoopBack
 */
var g = require('./globalize');
var async = require('async');
var debug = require('debug')('loopback:connector:db2');

module.exports = function(DB2) {
  DB2.prototype.showFields = function(model, cb) {
    var sql = 'SELECT COLNAME AS NAME, TYPENAME AS DATATYPE, ' +
      'COLNO, LENGTH AS DATALENGTH, NULLS FROM SYSCAT.COLUMNS ' +
      'WHERE TABNAME LIKE \'' +
      self.table(model) + '\' ' +
      'AND TABSCHEMA LIKE \'' +
      self.schema + '\'' +
      ' ORDER BY COLNO';
    this.execute(sql, function(err, fields) {
      if (err) {
        return cb(err);
      } else {
        cb(err, fields);
      }
    });
  };

  DB2.prototype.showIndexes = function(model, cb) {
    var sql = 'SELECT TABNAME, TABSCHEMA, INDNAME, ' +
      'COLNAMES, UNIQUERULE FROM SYSCAT.INDEXES ' +
      'WHERE TABNAME LIKE \'' +
      self.table(model) + '\' ' +
      'AND TABSCHEMA LIKE \'' +
      self.schema + '\'';
    this.execute(sql, function(err, indexes) {
      if (err) {
        return cb(err);
      } else {
        cb(err, indexes);
      }
    });
  };

  DB2.prototype.isActual = function(models, cb) {
    debug('DB2.prototype.isActual %j %j', models, cb);
    var self = this;

    if ((!cb) && (typeof models === 'function')) {
      cb = models;
      models = undefined;
    }

    // First argument is a model name
    if (typeof models === 'string') {
      models = [models];
    }

    models = models || Object.keys(this._models);

    // var changes = [];
    async.each(models, function(model, done) {
      self.getTableStatus(model, function(err, fields, indexes) {
        if (err) {
          return done(Error(err));
        }
        // TODO: VALIDATE fields/indexes against model definition
        done();
      });
    }, function done(err) {
      if (err) {
        return cb && cb(err);
      }
      var actual = true; // (changes.length === 0);
      if (cb) cb(null, actual);
    });
  };
};
