var debug = require('debug')('loopback:connector:db2:transaction');
var Transaction = require('loopback-connector').Transaction;

module.exports = mixinTransaction;

/*!
 * @param {DB2} DB2 connector class
 */
function mixinTransaction(DB2, db2) {

  // function setAutoCommit() {
  //   var self = this;
  //   self.client.autocommit(self.connection, self.client.SQL_AUTOCOMMIT_OFF);
  //   return;
  // };

  /**
   * Begin a new transaction
   *
   * @param {Integer} isolationLevel
   * @param {Function} cb
   */
  DB2.prototype.beginTransaction = function(isolationLevel, cb) {
    var self = this;
    debug('Begin a transaction with isolation level: %s', isolationLevel);
    if (isolationLevel !== Transaction.READ_COMMITTED &&
      isolationLevel !== Transaction.SERIALIZABLE) {
      var err = new Error('Invalid isolationLevel: ' + isolationLevel);
      err.statusCode = 400;
      return process.nextTick(function() {
        cb(err);
      });
    }

    self.pool.open(this.connStr, function(err, connection) {
      if (err) return cb(err);

      // setAutoCommit();

      if (isolationLevel) {
        var sql = 'SET CURRENT ISOLATION LEVEL TO ';
        switch (isolationLevel) {
          case Transaction.READ_COMMITTED:
            sql += 'CS';
            break;
          case Transaction.READ_UNCOMMITTED:
            sql += 'UR';
            break;
          case Transaction.REPEATABLE_READ:
            sql += 'RS';
            break;
          case Transaction.SERIALIZABLE:
            sql += 'RR';
            break;
        }

        self.connection.query(sql, [], function(err) {
          cb(err, connection);
        });
      } else {
        cb(err, connection);
      }
    });
  };

  /**
   * Commit the transaction
   *
   * @param {Object} connection
   * @param {Function} cb
   */
  DB2.prototype.commit = function(connection, cb) {
    debug('Commit a transaction');
    connection.commit(function(err) {
      if (err) return cb(err);
      // connection.setAutoCommit(true);
      connection.close(cb);
    });
  };

  /**
   * Rollback the transaction
   *
   * @param {Object} connection
   * @param {Function} cb
   */
  DB2.prototype.rollback = function(connection, cb) {
    debug('Rollback a transaction');
    connection.rollback(function(err) {
      if (err) return cb(err);
      connection.setAutoCommit(true);
      connection.close(cb);
    });
  };
}
