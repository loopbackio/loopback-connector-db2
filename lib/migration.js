/*!
 * DB2 connector for LoopBack
 */
var async = require('async');
var debug = require('debug')('loopback:connector:db2');

module.exports = function(DB2) {
  /*
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

  /*
   * Discover the properties from a table
   * @param {String} model The model name
   * @param {Function} cb The callback function
   */
  DB2.prototype.getTableStatus = function(model, cb) {
    var self = this;
    var sql = 'SELECT COLNAME AS NAME, TYPENAME AS DATATYPE, ' +
      'LENGTH AS DATALENGTH FROM SYSCAT.COLUMNS ' +
      'WHERE TABNAME LIKE \'' +
      self.table(model).toUpperCase() + '\' ' +
      'AND TABSCHEMA LIKE \'' +
      self.schema.toUpperCase() + '\'';

    self.execute(sql, function(err, tableInfo) {
      if (err) {
        cb(err);
      } else {
        var isql = 'SELECT INDNAME, COLNAMES, UNIQUERULE ' +
          'FROM SYSCAT.INDEXES ' +
          'WHERE TABNAME LIKE \'' +
          self.table(model).toUpperCase() + '\' ' +
          'AND TABSCHEMA LIKE \'' +
          self.schema.toUpperCase() + '\'';

        self.execute(isql, function(err, indexInfo) {
          if (err) {
            cb(err);
          } else {
            cb(err, tableInfo, indexInfo);
          }
        });
      }
    });
  };

  DB2.prototype.alterTable = function(model, actualFields, actualIndexes,
                                      done, checkOnly) {
    debug('DB2.prototype.alterTable %j %j %j %j %j',
          model, actualFields, actualIndexes, done, checkOnly);

    var self = this;
    var m = this.getModelDefinition(model);
    var propNames = Object.keys(m.properties).filter(function(name) {
      return !!m.properties[name];
    });
    var indexes = m.settings.indexes || {};
    var indexNames = Object.keys(indexes).filter(function(name) {
      return !!m.settings.indexes[name];
    });
    var sql = [];
    var ai = {};
    var type = '';
    var query = '';

    if (actualIndexes) {
      actualIndexes.forEach(function(i) {
        var name = i.INDNAME;
        if (!ai[name]) {
          ai[name] = {
            info: i,
            columns: [],
          };
        }
        ai[name].columns[i.Seq_in_index - 1] = i.COLNAMES;
      });
    }
    var aiNames = Object.keys(ai);

    // change/add new fields
    propNames.forEach(function(propName) {
      if (m.properties[propName] && self.id(model, propName)) return;
      var found;
      if (actualFields) {
        actualFields.forEach(function(f) {
          if (f.NAME === propName) {
            found = f;
          }
        });
      }

      if (found) {
        actualize(propName, found);
      } else {
        sql.push('ADD COLUMN ' + propName + ' ' +
          self.buildColumnDefinition(model, propName));
      }
    });

    // drop columns
    if (actualFields) {
      actualFields.forEach(function(f) {
        var notFound = !~propNames.indexOf(f.NAME);
        if (m.properties[f.NAME] && self.id(model, f.NAME)) return;
        if (notFound || !m.properties[f.NAME]) {
          sql.push('DROP COLUMN ' + f.NAME);
        }
      });
    }

    if (sql.length) {
      query = 'ALTER TABLE ' + self.table(model) + ' ' + sql.join(' ') + ';';
    }

    sql = [];

    // remove indexes
    aiNames.forEach(function(indexName) {
      if (indexName === 'PRIMARY' ||
        (m.properties[indexName] && self.id(model, indexName))) return;

      if (indexNames.indexOf(indexName) === -1 && !m.properties[indexName] ||
        m.properties[indexName] && !m.properties[indexName].index) {

        if (ai[indexName].info.UNIQUERULE === 'P') {
          sql.push('DROP PRIMARY KEY');
        } else if (ai[indexName].info.UNIQUERULE === 'U') {
          sql.push('DROP UNIQUE ' + indexName);
        }

      } else {
        // first: check single (only type and kind)
        if (m.properties[indexName] && !m.properties[indexName].index) {
          // TODO
          return;
        }
        // second: check multiple indexes
        var orderMatched = true;
        if (indexNames.indexOf(indexName) !== -1) {
          m.settings.indexes[indexName].columns.split(/,\s*/).forEach(
            function(columnName, i) {
              if (ai[indexName].columns[i] !== columnName) orderMatched = false;
            });
        }

        if (!orderMatched) {
          if (ai[indexName].info.UNIQUERULE === 'P') {
            sql.push('DROP PRIMARY KEY');
          } else if (ai[indexName].info.UNIQUERULE === 'U') {
            sql.push('DROP UNIQUE ' + indexName);
          }

          delete ai[indexName];
        }
      }
    });

    if (sql.length) {
      query = query + '\n' +
        'ALTER TABLE ' + self.table(model) + ' ' + sql.join(' ') + ';';
    }

    sql = [];

    // add single-column indexes
    propNames.forEach(function(propName) {
      var i = m.properties[propName].index;
      if (!i) {
        return;
      }
      var found = ai[propName] && ai[propName].info;
      if (!found) {
        var pName = propName;
        type = '';
        // var kind = '';
        if (i.type) {
          // type = 'USING ' + i.type;
          type = i.type;
        }
        // if (i.kind) {
        //   kind = i.kind;
        // }
        // if (kind && type) {
        //   sql.push('ADD ' + kind + ' CONSTRAINT ' + pName +
        //     ' (' + pName + ') ' + type);
        // } else {
        //   if (typeof i === 'object' && i.unique && i.unique === true) {
        //     kind = 'UNIQUE';
        //   }
        //   sql.push('ADD ' + kind + ' CONSTRAINT ' + pName + ' ' + type +
        //     ' (' + pName + ') ');
        // }
        sql.push('CREATE ' + type + ' INDEX ' + pName + ' ON ' +
                 self.table(model) + '(' + pName + ') ');
      }
    });

    if (sql.length) {
      query = query + '\n' + sql.join(' ');
      // 'ALTER TABLE ' + self.table(model) + ' ' + sql.join(' ') + ';';
    }

    sql = [];

    // add multi-column indexes
    indexNames.forEach(function(indexName) {
      var i = m.settings.indexes[indexName];
      var found = ai[indexName] && ai[indexName].info;
      if (!found) {
        var iName = indexName;
        var type = '';
        // var kind = '';
        if (i.type) {
          // type = 'USING ' + i.type;
          type = i.type;
        }
        // if (i.kind) {
        //   kind = i.kind;
        // }
        // if (kind && type) {
        //   sql.push('ADD ' + kind + ' CONSTRAINT ' + iName +
        //     ' (' + i.columns + ') ' + type);
        // } else {
        // sql.push('ADD ' + kind + ' CONSTRAINT ' + iName + ' ' + type +
        //   ' (' + i.columns + ')');
        // }
        sql.push('CREATE ' + type + ' INDEX ' + iName + ' ON ' +
                 self.tableEscaped(model) + '(' + i.columns + ') ');
      }
    });

    if (sql.length) {
      query = query + '\n' + sql.join(' ');
      // 'ALTER TABLE ' + self.table(model) + ' ' + sql.join(' ') + ';';
    }

    if (query.length) {

      if (checkOnly) {
        done(null, true, {statements: sql, query: query});
      } else {
        this.execute(query, done);
      }
    } else {
      done();
    }

    function actualize(propName, oldSettings) {
      var newSettings = m.properties[propName];
      if (newSettings && changed(newSettings, oldSettings)) {
        var pName = '\'' + propName + '\'';
        sql.push('CHANGE COLUMN ' + pName + ' ' + pName + ' ' +
          self.buildColumnDefinition(model, propName));
      }
    }

    function changed(newSettings, oldSettings) {
      if (oldSettings.Null === 'YES') {
        // Used to allow null and does not now.
        if (!self.isNullable(newSettings)) {
          return true;
        }
      }
      if (oldSettings.Null === 'NO') {
        // Did not allow null and now does.
        if (self.isNullable(newSettings)) {
          return true;
        }
      }

      // if (oldSettings.Type.toUpperCase() !==
      //   self.buildColumnType(newSettings).toUpperCase()) {
      //   return true;
      // }
      return false;
    }
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
};
