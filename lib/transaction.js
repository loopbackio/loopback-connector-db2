// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-db2
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var debug = require('debug')('loopback:connector:db2:transaction');
var Transaction = require('loopback-connector').Transaction;

module.exports = mixinTransaction;

/*!
 * @param {DB2} DB2 connector class
 */
function mixinTransaction(DB2, db2) {

  /**
   * Begin a new transaction

   * @param {Integer} isolationLevel
   * @param {Function} cb
   */
  DB2.prototype.beginTransaction = function(isolationLevel, cb) {
    debug('Begin a transaction with isolation level: %s', isolationLevel);

    var self = this;

    if (isolationLevel !== Transaction.READ_COMMITTED &&
      isolationLevel !== Transaction.SERIALIZABLE) {
      var err = new Error('Invalid isolationLevel: ' + isolationLevel);
      err.statusCode = 400;
      return process.nextTick(function() {
        cb(err);
      });
    }

    self.connStr += ';IsolationLevel=ReadCommitted';

    self.client.open(self.connStr, function(err, connection) {
      if (err) return cb(err);
      connection.beginTransaction(function(err) {
        if (isolationLevel) {
          var sql;
          if (self.isDB2z) {
            // sql = 'CHANGE ISOLATION TO CS'; // + isolationLevel;
          } else {
            sql = 'SET CURRENT ISOLATION TO ' + isolationLevel;
          }

          if (sql) {
            connection.query(sql, function(err) {
              cb(err, connection);
            });
          } else {
            cb(err, connection);
          }
        } else {
          cb(err, connection);
        }
      });
    });
  };

  /**
   * Commit a transaction
   *
   * @param {Object} connection
   * @param {Function} cb
   */
  DB2.prototype.commit = function(connection, cb) {
    debug('Commit a transaction');
    connection.commitTransaction(function(err) {
      if (err) return cb(err);
      connection.close(cb);
    });
  };

  /**
   * Roll back a transaction
   *
   * @param {Object} connection
   * @param {Function} cb
   */
  DB2.prototype.rollback = function(connection, cb) {
    debug('Rollback a transaction');
    connection.rollbackTransaction(function(err) {
      if (err) return cb(err);
      // connection.setAutoCommit(true);
      connection.close(cb);
    });
  };
}
