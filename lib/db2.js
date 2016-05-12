// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-db2
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

/*!
 * DB2 connector for LoopBack
 */
var SqlConnector = require('loopback-connector').SqlConnector;
var ParameterizedSQL = SqlConnector.ParameterizedSQL;
var Driver = require('ibm_db');
var util = require('util');
var debug = require('debug')('loopback:connector:db2');
var async = require('async');
var Transaction = require('loopback-connector').Transaction;

/**
 * Initialize the DB2 connector for the given data source
 *
 * @param {DataSource} ds The data source instance
 * @param {Function} [cb] The cb function
 */
exports.initialize = function(ds, cb) {
  ds.connector = new DB2(ds.settings);
  ds.connector.dataSource = ds;
  if (cb) {
    if (ds.settings.lazyConnect) {
      process.nextTick(function() {
        cb();
      });
    } else {
      ds.connector.connect(cb);
    }
  }
};

/**
 * The constructor for the DB2 LoopBack connector
 *
 * @param {Object} settings The settings object
 * @constructor
 */
function DB2(settings) {
  debug('DB2 constructor settings: %j', settings);
  SqlConnector.call(this, 'db2', settings);
  this.debug = settings.debug || debug.enabled;
  this.useLimitOffset = settings.useLimitOffset || false;
  this.client = new Driver.Pool();
  this.dbname = (settings.database || settings.db || 'testdb');
  this.dsn = settings.dsn;
  this.hostname = (settings.hostname || settings.host);
  this.username = (settings.username || settings.user);
  this.password = settings.password;
  this.portnumber = settings.port;
  this.protocol = (settings.protocol || 'TCPIP');
  this.supportColumnStore = (settings.supportColumnStore || false);
  this.supportDashDB = (settings.supportDashDB || false);
  this.isDB2z = (settings.supportDB2z || false);

  var dsn = settings.dsn;
  if (dsn) {
    this.connStr = dsn;

    var DSNObject = parseDSN(dsn);
    if (!('CurrentSchema' in DSNObject)) {
      this.connStr += ';CurrentSchema=' + DSNObject.UID;
    }
    this.schema = DSNObject.CurrentSchema || DSNObject.UID;
  } else {
    var connStrGenerate =
      'DRIVER={DB2}' +
      ';DATABASE=' + this.dbname +
      ';HOSTNAME=' + this.hostname +
      ';UID=' + this.username +
      ';PWD=' + this.password +
      ';PORT=' + this.portnumber +
      ';PROTOCOL=' + this.protocol;
    this.connStr = connStrGenerate;

    this.schema = this.username;
    if (settings.schema) {
      this.connStr += ';CurrentSchema=' + settings.schema;
      this.schema = settings.schema.toUpperCase();
    }
  }

  // This is less than ideal, better idea would be
  // to extend the propagation of the filter object
  // to executeSQL or pass the options obj around
  this.limitRE = /LIMIT (\d+)/;
  this.offsetRE = /OFFSET (\d+)/;
}

function parseDSN(dsn) {
  // Split dsn into an array of optionStr
  var dsnOption = dsn.split(';');
  // Handle dsn string ended with ';'
  if (!dsnOption[dsnOption.length - 1]) {
    dsnOption.pop();
  }

  // Convert Array<String> into Object
  var result = {};
  dsnOption.forEach(function(str) {
    var strSplit = str.split('=');
    result[strSplit[0]] = strSplit[1];
  });

  return result;
}

util.inherits(DB2, SqlConnector);

function testConnection(conn) {
  var sql = 'SELECT COUNT(*) AS COUNT FROM SYSIBM.SYSTABLES';
  var rows = conn.querySync(sql, null);

  if (rows.length > 0 && rows[0]['COUNT'] > 0) {
    return true;
  } else {
    return false;
  }
};

DB2.prototype.ping = function(cb) {
  var self = this;

  if (self.dataSource.connection) {
    if (!testConnection(self.dataSource.connection)) {
      return cb && cb(Error('Failed to use connection'));
    }
    cb && cb();
  } else {
    self.connect(function(err, conn) {
      if (err) {
        cb && cb(Error(err));
      } else if (!testConnection(conn)) {
        cb && cb(Error('Failed to use connection'));
      } else {
        cb && cb();
      }
    });
  }

  return;
};

DB2.prototype.tableEscaped = function(model) {
  var escapedName = this.escapeName(this.table(model));
  return escapedName;
};

/**
 * Connect to DB2
 *
 * {Function} [cb] The callback after the connect
 */
DB2.prototype.connect = function(cb) {
  var self = this;

  if (!self.dsn && (!self.hostname ||
      !self.portnumber ||
      !self.username ||
      !self.password ||
      !self.protocol)) {
    console.log('Invalid connection string: ', self.connStr);
    return (cb && cb());
  }

  self.dataSource.connecting = true;
  self.client.open(this.connStr, function(err, con) {
    debug('DB2.prototype.connect (%s) err=%j con=%j', self.connStr, err, con);
    if (err) {
      self.dataSource.connected = false;
      self.dataSource.connecting = false;
    } else {
      self.connection = con;
      self.dataSource.connected = true;
      self.dataSource.connecting = false;
      self.dataSource.emit('connected');
    }
    cb && cb(err, con);
  });
};

/**
 * Execute the sql statement
 *
 */
DB2.prototype.executeSQL = function(sql, params, options, callback) {
  debug('DB2.prototype.executeSQL (enter)',
        sql, params, options);
  var self = this;
  var conn = self.connection;

  if (options.transaction) {
    conn = options.transaction.connection;
  }

  var limit = 0;
  var offset = 0;
  // This is standard DB2 syntax. LIMIT and OFFSET
  // are configured off by default. Enable these to
  // leverage LIMIT and OFFSET.
  if (!this.useLimitOffset) {
    var res = sql.match(self.limitRE);
    if (res) {
      limit = Number(res[1]);
      sql = sql.replace(self.limitRE, '');
    }
    res = sql.match(this.offsetRE);
    if (res) {
      offset = Number(res[1]);
      sql = sql.replace(self.offsetRE, '');
    }
  }

  conn.query(sql, params, function(err, data, more) {
    debug('DB2.prototype.executeSQL (exit)' +
          ' sql=%j params=%j err=%j data=%j more=%j',
          sql, params, err, data, more);
    // schedule callback as there is more code to
    // execute in the db2 driver to cleanup the current query
    if (offset || limit) {
      data = data.slice(offset, offset + limit);
    }

    if (!err) {
      if (more) {
        process.nextTick(function() {
          return callback(err, data);
        });
      }
    }

    callback && callback(err, data);
  });
};

/**
 * Escape an identifier such as the column name
 * DB2 requires double quotes for case-sensitivity
 *
 * @param {string} name A database identifier
 * @returns {string} The escaped database identifier
 */
DB2.prototype.escapeName = function(name) {
  debug('DB2.prototype.escapeName name=%j', name);
  if (!name) return name;
  name.replace(/["]/g, '""');
  return '"' + name + '"';
};

function dateToDB2(val) {
  var dateStr = val.getFullYear() + '-'
      + fillZeros(val.getMonth() + 1) + '-'
      + fillZeros(val.getDate()) + '-'
      + fillZeros(val.getHours()) + '.'
      + fillZeros(val.getMinutes()) + '.'
      + fillZeros(val.getSeconds()) + '.';
  var ms = val.getMilliseconds();
  if (ms < 10) {
    ms = '00000' + ms;
  } else if (ms < 100) {
    ms = '0000' + ms;
  } else {
    ms = '000' + ms;
  }
  return dateStr + ms;
  function fillZeros(v) {
    return v < 10 ? '0' + v : v;
  }
}

/**
 * Convert property name/value to an escaped DB column value
 *
 * @param {Object} prop Property descriptor
 * @param {*} val Property value
 * @returns {*} The escaped value of DB column
 */
DB2.prototype.toColumnValue = function(prop, val) {
  debug('DB2.prototype.toColumnValue prop=%j val=%j', prop, val);
  if (val === null) {
    if (prop.autoIncrement || prop.id) {
      return new ParameterizedSQL('DEFAULT');
    }
    return null;
  }
  if (!prop) {
    return val;
  }
  switch (prop.type.name) {
    default:
    case 'Array':
    case 'Number':
    case 'String':
      return val;
    case 'Boolean':
      return Number(val);
    case 'GeoPoint':
    case 'Point':
    case 'List':
    case 'Object':
    case 'ModelConstructor':
      return JSON.stringify(val);
    case 'JSON':
      return String(val);
    case 'Date':
      return dateToDB2(val);
  }
};

/*!
 * Convert the data from database column to model property
 *
 * @param {object} Model property descriptor
 * @param {*) val Column value
 * @returns {*} Model property value
 */
DB2.prototype.fromColumnValue = function(prop, val) {
  debug('DB2.prototype.fromColumnValue %j %j', prop, val);
  if (val === null || !prop) {
    return val;
  }
  switch (prop.type.name) {
    case 'Number':
      return Number(val);
    case 'String':
      return String(val);
    case 'Date':
      return new Date(val);
    case 'Boolean':
      return Boolean(val);
    case 'GeoPoint':
    case 'Point':
    case 'List':
    case 'Array':
    case 'Object':
    case 'JSON':
      return JSON.parse(val);
    default:
      return val;
  }
};

/**
 * Get the place holder in SQL for identifiers, such as ??
 *
 * @param {string} key Optional key, such as 1 or id
 */
DB2.prototype.getPlaceholderForIdentifier = function(key) {
  throw new Error('Placeholder for identifiers is not supported: ' + key);
};

/**
 * Get the place holder in SQL for values, such as :1 or ?
 *
 * @param {string} key Optional key, such as 1 or id
 * @returns {string} The place holder
 */
DB2.prototype.getPlaceholderForValue = function(key) {
  debug('DB2.prototype.getPlaceholderForValue key=%j', key);
  return '(?)';
};


/**
 * Build the clause for default values if the fields is empty
 *
 * @param {string} model The model name
 * @returns {string} default values statement
 */
DB2.prototype.buildInsertDefaultValues = function(model) {
  var def = this.getModelDefinition(model);
  var num = Object.keys(def.properties).length;
  var result = '';
  if (num > 0) result = 'DEFAULT';
  for (var i = 1; i < num && num > 1; i++) {
    result = result.concat(',DEFAULT');
  }
  return 'VALUES(' + result + ')';
};

/**
 * Create the table for the given model
 *
 * @param {string} model The model name
 * @param {Object} [options] options
 * @param {Function} [cb] The callback function
 */
DB2.prototype.createTable = function(model, options, cb) {
  debug('DB2.prototype.createTable ', model, options);
  cb();
};

DB2.prototype.buildIndex = function(model, property) {
  debug('DB2.prototype.buildIndex %j %j', model, property);
};

DB2.prototype.buildIndexes = function(model) {
  debug('DB2.prototype.buildIndexes %j', model);
};

/**
 * Create the data model in DB2
 *
 * @param {string} model The model name
 * @param {Object} data The model instance data
 * @param {Object} options Options object
 * @param {Function} [callback] The callback function
 */
DB2.prototype.create = function(model, data, options, callback) {
  var self = this;
  var stmt = self.buildInsert(model, data, options);
  var id = self.idName(model);
  var sql = 'SELECT \"' + id + '\" FROM FINAL TABLE (' + stmt.sql + ')';
  self.execute(sql, stmt.params, options, function(err, info) {
    if (err) {
      callback(err);
    } else {
      callback(err, info[0][id]);
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
  var self = this;
  var stmt = self.buildUpdate(model, where, data, options);
  var id = self.idName(model);
  var sql = 'SELECT \"' + id + '\" FROM FINAL TABLE (' + stmt.sql + ')';
  self.execute(sql, stmt.params, options, function(err, info) {
    if (cb) {
      cb(err, {count: info.length});
    }
  });
};

/**
 * Update if the model instance exists with the same id or create a new instance
 *
 * @param {string} model The model name
 * @param {Object} data The model instance data
 * @param {Function} [callback] The callback function
 */
DB2.prototype.updateOrCreate = DB2.prototype.save =
  function(model, data, options, callback) {
    var self = this;
    var id = self.idName(model);
    var stmt;
    var tableName = self.tableEscaped(model);
    var meta = {};

    function executeWithConnection(connection, cb) {
      // Execution for updateOrCreate requires running two
      // separate SQL statements.  The second depends on the
      // result of the first.
      var countStmt = new ParameterizedSQL('SELECT COUNT(*) AS CNT FROM ');
      countStmt.merge(tableName);
      countStmt.merge(self.buildWhere(data));

      connection.query(countStmt.sql, countStmt.params,
        function(err, countData) {
          if (err) {
            return cb(err);
          }

          if (countData[0]['CNT'] > 0) {
            stmt = self.buildUpdate(model, data.id, data);
          } else {
            stmt = self.buildInsert(model, data);
          }

          connection.query(stmt.sql, stmt.params, function(err, sData) {
            if (err) {
              return cb(err);
            }

            if (countData[0]['CNT'] > 0) {
              meta.isNewInstance = false;
              cb(null, data, meta);
            } else {
              stmt = 'SELECT MAX(' + id + ') as id FROM ' + tableName;
              connection.query(stmt, null, function(err, info) {
                if (err) {
                  return cb(err);
                }
                data.id = info[0]['CNT'];
                cb(null, data, meta);
              });
            }
          });
        });
    };

    if (options.transaction) {
      executeWithConnection(options.transaction.connection,
        function(err, data, meta) {
          if (err) {
            return callback && callback(err);
          } else {
            return callback && callback(null, data, meta);
          }
        });
    } else {
      self.beginTransaction(Transaction.READ_COMMITTED, function(err, conn) {
        // self.client.open(self.connStr, function(err, conn) {
        if (err) {
          return callback && callback(err);
        }

        // conn.beginTransaction(function(err) {
        if (err) {
          return callback && callback(err);
        }

        executeWithConnection(conn, function(err, data, meta) {
          if (err) {
            conn.rollbackTransaction(function(err) {
              conn.close(function() {});
              return callback && callback(err);
            });
          } else {
            options.transaction = undefined;
            conn.commitTransaction(function(err) {
              if (err) {
                return callback && callback(err);
              }

              conn.close(function() {});
              return callback && callback(null, data, meta);
            });
          }
        });
        // });
      });
    }
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
  var self = this;
  var stmt = self.buildDelete(model, where, options);
  var id = self.idName(model);
  var sql = 'SELECT \"' + id + '\" FROM OLD TABLE (' + stmt.sql + ')';
  self.execute(sql, stmt.params, options, function(err, info) {
    if (cb) {
      cb(err, {count: info.length});
    }
  });
};

function buildLimit(limit, offset) {
  if (isNaN(limit)) { limit = 0; }
  if (isNaN(offset)) { offset = 0; }
  if (!limit && !offset) {
    return '';
  }
  if (limit && !offset) {
    return 'FETCH FIRST ' + limit + ' ROWS ONLY';
  }
  if (offset && !limit) {
    return 'OFFSET ' + offset;
  }
  return 'LIMIT ' + limit + ' OFFSET ' + offset;
}

DB2.prototype.applyPagination = function(model, stmt, filter) {
  debug('DB2.prototype.applyPagination');
  var limitClause = buildLimit(filter.limit, filter.offset || filter.skip);
  return stmt.merge(limitClause);
};


DB2.prototype.getCountForAffectedRows = function(model, info) {
  var affectedRows = info && typeof info.affectedRows === 'number' ?
      info.affectedRows : undefined;
  return affectedRows;
};

/**
 * Drop the table for the given model from the database
 *
 * @param {string} model The model name
 * @param {Function} [cb] The callback function
 */
DB2.prototype.dropTable = function(model, cb) {
  var self = this;
  var dropStmt = 'DROP TABLE ' + self.schema + '.' +
    self.tableEscaped(model);

  self.execute(dropStmt, null, null, function(err, countData) {
    if (err) {
      if (!err.toString().includes('42704')) {
        return cb && cb(err);
      }
    }
    return cb && cb(err);
  });
};

DB2.prototype.createTable = function(model, cb) {
  var self = this;
  var tableName = self.tableEscaped(model);
  var tableSchema = self.schema;
  var columnDefinitions = self.buildColumnDefinitions(model);
  var tasks = [];

  if (self.supportColumnStore && self.supportColumnStore === true) {
    return cb(new Error('Column organized tables are not ' +
                        'currently supported'));
  } else if (self.supportDashDB) {
    tasks.push(function(callback) {
      var sql = 'CREATE TABLE ' + tableSchema + '.' + tableName +
          ' (' + columnDefinitions + ') ORGANIZE BY ROW;';
      self.execute(sql, callback);
    });
  } else {
    tasks.push(function(callback) {
      var sql = 'CREATE TABLE ' + tableSchema + '.' + tableName +
          ' (' + columnDefinitions + ');';
      self.execute(sql, callback);
    });
  }

  var indexes = self.buildIndexes(model);
  indexes.forEach(function(i) {
    tasks.push(function(callback) {
      self.execute(i, callback);
    });
  });

  async.series(tasks, cb);
};

DB2.prototype.buildColumnDefinitions = function(model) {
  var self = this;
  var sql = [];
  var definition = this.getModelDefinition(model);
  var pks = this.idNames(model).map(function(i) {
    return self.columnEscaped(model, i);
  });
  Object.keys(definition.properties).forEach(function(prop) {
    var colName = self.columnEscaped(model, prop);
    sql.push(colName + ' ' + self.buildColumnDefinition(model, prop));
  });
  if (pks.length > 0) {
    sql.push('PRIMARY KEY(' + pks.join(',') + ')');
  }

  return sql.join(',\n');
};

DB2.prototype.buildIndex = function(model, property) {
  var self = this;
  // var prop = self.getModelDefinition(model).properties[property];
  var prop = self.getPropertyDefinition(model, property);
  var i = prop && prop.index;
  if (!i) {
    return '';
  }

  var stmt = 'CREATE ';
  var kind = '';
  if (i.kind) {
    kind = i.kind;
  }
  var columnName = self.columnEscaped(model, property);
  if (typeof i === 'object' && i.unique && i.unique === true) {
    kind = 'UNIQUE';
  }
  return (stmt + kind + ' INDEX ' + columnName +
          ' ON ' + self.schema + '.' + self.tableEscaped(model) +
          ' (' + columnName + ');\n');
};

DB2.prototype.buildIndexes = function(model) {
  var indexClauses = [];
  var definition = this.getModelDefinition(model);
  var indexes = definition.settings.indexes || {};
  // Build model level indexes
  for (var index in indexes) {
    var i = indexes[index];
    var stmt = 'CREATE ';
    var kind = '';
    if (i.kind) {
      kind = i.kind;
    }
    var indexedColumns = [];
    var indexName = this.escapeName(index);
    if (Array.isArray(i.keys)) {
      indexedColumns = i.keys.map(function(key) {
        return this.columnEscaped(model, key);
      });
    }

    var columns = (i.columns.split(/,\s*/)).join('\",\"');
    if (indexedColumns.length > 0) {
      columns = indexedColumns.join('\",\"');
    }

    indexClauses.push(stmt + kind + ' INDEX ' + indexName +
                      ' ON ' + this.schema + '.' + this.tableEscaped(model) +
                      ' (\"' + columns + '\");\n');
  }

  // Define index for each of the properties
  // for (var p in definition.properties) {
  //   var propIndex = this.buildIndex(model, p);
  //   if (propIndex) {
  //     indexClauses.push(propIndex);
  //   }
  // }

  return indexClauses;
};

DB2.prototype.buildColumnDefinition = function(model, prop) {
  // var p = this.getModelDefinition(model).properties[prop];
  var p = this.getPropertyDefinition(model, prop);
  if (p.id && p.generated) {
    return 'INT NOT NULL GENERATED BY DEFAULT' +
      ' AS IDENTITY (START WITH 1 INCREMENT BY 1)';
  }
  var line = this.columnDataType(model, prop) + ' ' +
      (this.isNullable(p) ? '' : 'NOT NULL');
  return line;
};

DB2.prototype.columnDataType = function(model, property) {
  var prop = this.getPropertyDefinition(model, property);
  if (!prop) {
    return null;
  }
  return this.buildColumnType(prop);
};

DB2.prototype.buildColumnType = function buildColumnType(propertyDefinition) {
  var self = this;
  var dt = '';
  var p = propertyDefinition;
  var type = p.type.name;

  switch (type) {
    default:
    case 'JSON':
    case 'Object':
    case 'Any':
    case 'Text':
    case 'String':
      dt = self.convertTextType(p, 'VARCHAR');
      break;
    case 'Number':
      dt = self.convertNumberType(p, 'INTEGER');
      break;
    case 'Date':
      dt = 'TIMESTAMP';
      break;
    case 'Boolean':
      dt = 'SMALLINT';
      break;
    case 'Point':
    case 'GeoPoint':
      dt = 'POINT';
      break;
    case 'Enum':
      dt = 'ENUM(' + p.type._string + ')';
      dt = stringOptions(p, dt);
      break;
  }
  debug('DB2.prototype.buildColumnType %j %j', p.type.name, dt);
  return dt;
};

DB2.prototype.convertTextType = function convertTextType(p, defaultType) {
  var self = this;
  var dt = defaultType;
  var len = p.length ||
    ((p.type !== String) ? 4096 : p.id ? 255 : 512);

  if (p[self.name]) {
    if (p[self.name].dataLength) {
      len = p[self.name].dataLength;
    }
  }

  if (p[self.name] && p[self.name].dataType) {
    dt = String(p[self.name].dataType);
  } else if (p.dataType) {
    dt = String(p.dataType);
  }

  dt += '(' + len + ')';

  stringOptions(p, dt);

  return dt;
};

DB2.prototype.convertNumberType = function convertNumberType(p, defaultType) {
  var self = this;
  var dt = defaultType;
  var precision = p.precision;
  var scale = p.scale;

  if (p[self.name] && p[self.name].dataType) {
    dt = String(p[self.name].dataType);
    precision = p[self.name].dataPrecision;
    scale = p[self.name].dataScale;
  } else if (p.dataType) {
    dt = String(p.dataType);
  } else {
    return dt;
  }

  switch (dt) {
    case 'DECIMAL':
      dt = 'DECIMAL';
      if (precision && scale) {
        dt += '(' + precision + ',' + scale + ')';
      } else if (scale > 0) {
        throw new Error('Scale without Precision does not make sense');
      }
      break;
    default:
      break;
  }

  return dt;
};

function stringOptions(p, columnType) {
  if (p.charset) {
    columnType += ' CHARACTER SET ' + p.charset;
  }
  if (p.collation) {
    columnType += ' COLLATE ' + p.collation;
  }
  return columnType;
}

require('./migration')(DB2);
require('./discovery')(DB2);
require('./transaction')(DB2);
