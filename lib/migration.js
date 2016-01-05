/*!
 * DB2 connector for LoopBack
 */
var async = require('async');
var debug = require('debug')('loopback:connector:db2');

module.exports = function(DB2) {
  /**
   * Perform autoupdate for the given models
   * @param {String[]} [models] A model name or an array of model names.
   * If not present, apply to all models
   * @param {Function} [cb] The callback function
   */
  DB2.prototype.autoupdate = function(models, cb) {
    debug('DB2.prototype.autoupdate %j', models);
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

    async.each(models, function(model, done) {
      if (!(model in self._models)) {
        return process.nextTick(function() {
          done(new Error('Model not found: ' + model));
        });
      }
      self.getTableStatus(model, function(err, fields, indexes) {
        if (!err && fields.length) {
          self.alterTable(model, fields, indexes, done);
        } else {
          self.createTable(model, done);
        }
      });
    }, cb);
  };

  /**
   * Discover the properties from a table
   * @param {String} model The model name
   * @param {Function} cb The callback function
   */
  DB2.prototype.getTableStatus = function(model, cb) {
    // TODO
    cb(null, [], null);
  };


  DB2.prototype.buildIndex = function(model, property) {
    debug('DB2.prototype.buildIndex %j %j', model, property);
  };

  DB2.prototype.buildIndexes = function(model) {
    debug('DB2.prototype.buildIndexes %j', model);
  };

  DB2.prototype.isActual = function(models, cb) {
    debug('DB2.prototype.isActual %j %j', models, cb);
  };

  DB2.prototype.alterTable = function(model, actualFields,
                                      actualIndexes, done, checkOnly) {
    debug('DB2.prototype.alterTable %j %j %j %j %j',
          model, actualFields, actualIndexes, done, checkOnly);
  };
};
