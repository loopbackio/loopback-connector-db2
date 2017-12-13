// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-db2
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

/*!
 * DB2 connector for LoopBack
 */
var IBMDB = require('loopback-ibmdb').IBMDB;
var util = require('util');
var debug = require('debug')('loopback:connector:db2');

/**
 * Initialize the IBMDB connector for the given data source
 *
 * @param {DataSource} ds The data source instance
 * @param {Function} [cb] The cb function
 */
exports.initialize = function(ds, cb) {
  ds.connector = new DB2(ds.settings);
  ds.connector.dataSource = ds;

  cb();
};

function DB2(settings) {
  IBMDB.call(this, 'db2', settings);

  // This is less than ideal, better idea would be
  // to extend the propagation of the filter object
  // to executeSQL or pass the options obj around
  this.limitRE = /LIMIT (\d+)/;
  this.offsetRE = /OFFSET (\d+)/;
}

util.inherits(DB2, IBMDB);

/**
 * Create the data model in DB2
 *
 * @param {string} model The model name
 * @param {Object} data The model instance data
 * @param {Object} options Options object
 * @param {Function} [callback] The callback function
 */
DB2.prototype.create = function(model, data, options, callback) {
  debug('DB2.prototype.create: model=%s, data=%j, options=%j',
    model, data, options);
  var self = this;
  var stmt = self.buildInsert(model, data, options);
  var idName = self.idColumn(model);
  var sql;

  if (!data[idName]) {
    sql = 'SELECT \"' + idName + '\" FROM FINAL TABLE (' +
          stmt.sql + ')';
  } else {
    sql = stmt.sql;
  }

  self.execute(sql, stmt.params, options, function(err, info) {
    if (err) {
      callback(err);
    } else {
      if (data[idName]) return callback(err, data[idName]);

      callback(err, info[0][idName]);
    }
  });
};

/**
 * Update all instances that match the where clause with the given data
 *
 * @param {string} model The model name
 * @param {Object} where The where object
 * @param {Object} data The property/value object representing changes
 * to be made
 * @param {Object} options The options object
 * @param {Function} cb The callback function
 */
DB2.prototype.update = function(model, where, data, options, cb) {
  debug('DB2.prototype.update: model=%s, where=%j, data=%j options=%j',
    model, where, data, options);
  var self = this;
  var stmt = self.buildUpdate(model, where, data, options);
  var idName = self.idColumn(model);
  var sql = 'SELECT COUNT(\"' + idName + '\") AS \"affectedRows\" ' +
            'FROM FINAL TABLE (' + stmt.sql + ')';
  self.execute(sql, stmt.params, options, function(err, info) {
    if (cb) {
      cb(err, {count: Number.parseInt(info[0].affectedRows, 10)});
    }
  });
};

/**
 * Delete all matching model instances
 *
 * @param {string} model The model name
 * @param {Object} where The where object
 * @param {Object} options The options object
 * @param {Function} cb The callback function
 */
DB2.prototype.destroyAll = function(model, where, options, cb) {
  debug('DB2.prototype.destroyAll: model=%s, where=%j, options=%j',
    model, where, options);
  var self = this;
  var stmt = self.buildDelete(model, where, options);
  var idName = self.idColumn(model);
  var sql = 'SELECT COUNT(\"' + idName + '\") AS \"affectedRows\" ' +
            'FROM OLD TABLE (' + stmt.sql + ')';
  self.execute(sql, stmt.params, options, function(err, info) {
    if (cb) {
      cb(err, {count: Number.parseInt(info[0].affectedRows, 10)});
    }
  });
};

require('./discovery')(DB2);
require('./transaction')(DB2);
