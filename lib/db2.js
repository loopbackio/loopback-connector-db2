/*!
 * DB2 connector for LoopBack
 */
var SqlConnector = require('loopback-connector').SqlConnector;
var ParameterizedSQL = SqlConnector.ParameterizedSQL;
var Driver = require('ibm_db');
var util = require('util');
var debug = require('debug')('loopback:connector:db2');

/**
 * Initialize the DB2 connector for the given data source
 *
 * @param {DataSource} ds The data source instance
 * @param {Function} [cb] The cb function
 */
exports.initialize = function(ds, cb) {
  ds.connector = new DB2(ds.settings);
  ds.connector.dataSource = ds;
  if (cb) ds.connector.connect(cb);
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
  this.connStr =
    'DRIVER={DB2}' +
    ';DATABASE=' + (settings.database || settings.db || 'test') +
    ';HOSTNAME=' + (settings.hostname || settings.host) +
    ';UID=' + settings.username +
    ';PWD=' + settings.password +
    ';PORT=' + settings.port +
    ';PROTOCOL=TCPIP';

  this.schema = settings.username;
  if (settings.schema) {
    this.connStr += ';CurrentSchema=' + settings.schema;
    this.schema = settings.schema;
  }
  // this is less than ideal, better idea would be
  // to extend the propagation of the filter object
  // to executeSQL or pass the options obj around
  this.limitRE = /LIMIT (\d+)/;
  this.offsetRE = /OFFSET (\d+)/;
}

util.inherits(DB2, SqlConnector);

DB2.prototype.tableEscaped = function(model) {
  var escapedName = this.schema + '.' + this.table(model);
  return escapedName;
};

/**
 * Connect to DB2
 *
 * {Function} [cb] The callback after the connect
 */
DB2.prototype.connect = function(cb) {
  var self = this;
  self.dataSource.connecting = true;
  self.client.open(this.connStr, function(err, con) {
    debug('DB2.prototype.connect (%s) err=%j con=%j', self.connStr, err, con);
    self.connection = con;
    cb(err, con);
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
  var limit = 0;
  var offset = 0;
  // This is standard DB2 syntax. LIMIT and OFFSET
  // are configured off by default. Enable these to
  // leverage LIMIT and OFFSET.
  if (!this.useLimitOffset) {
    var res = sql.match(this.limitRE);
    if (res) {
      limit = Number(res[1]);
      sql = sql.replace(this.limitRE, '');
    }
    res = sql.match(this.offsetRE);
    if (res) {
      offset = Number(res[1]);
      sql = sql.replace(this.offsetRE, '');
    }
  }

  self.connection.query(sql, params, function(err, data, more) {
    debug('DB2.prototype.executeSQL (exit)' +
          ' sql=%j params=%j err=%j data=%j more=%j',
          sql, params, err, data, more);
    // schedule callback as there is more code to
    // execute in the db2 driver to cleanup the current query
    if (offset || limit) {
      data = data.slice(offset, offset + limit);
    }
    process.nextTick(function() {
      callback(err, data);
    });
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

/**
 * Create the data model in DB2
 *
 * @param {string} model The model name
 * @param {Object} data The model instance data
 * @param {Object} options Options object
 * @param {Function} [callback] The callback function
 */
DB2.prototype.create = function(model, data, options, callback) {
  var stmt = this.buildInsert(model, data, options);
  var id = this.idName(model);
  var sql = 'SELECT \"' + id + '\" FROM FINAL TABLE (' + stmt.sql + ')';
  this.execute(sql, stmt.params, options, function(err, info) {
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
  var stmt = this.buildUpdate(model, where, data, options);
  var id = this.idName(model);
  var sql = 'SELECT \"' + id + '\" FROM FINAL TABLE (' + stmt.sql + ')';
  this.execute(sql, stmt.params, options, function(err, info) {
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
    var fields = this.buildFields(model, data);
    var id = this.idName(model);
    var sql = new ParameterizedSQL('MERGE INTO ' +
                                   this.schema.toUpperCase() + '.' +
                                   this.table(model));
    var columnValues = fields.columnValues;
    var fieldNames = fields.names;
    var setValues = [];

    var definition = this.getModelDefinition(model);

    if (fieldNames.length) {
      sql.merge('AS MT(');

      Object.keys(definition.properties).forEach(function(prop) {
        setValues.push(new ParameterizedSQL(self.columnEscaped(model, prop)));
      });

      var columns = ParameterizedSQL.join(setValues, ',');
      sql.merge(columns);
      sql.merge(')');
      sql.merge('USING (SELECT * FROM TABLE( VALUES(');

      setValues = [];
      for (var i = 0, n = fields.names.length; i < n; i++) {
        setValues.push(new ParameterizedSQL('CAST (' + columnValues[i].sql +
          ' AS ' +
          this.buildColumnType(fields.properties[i]) + ')',
          columnValues[i].params));

        if (i < (n - 1))
          setValues[i].sql = setValues[i].sql + ',';
      }

      sql.merge(setValues);
      sql.merge('))) AS VT(' + fieldNames.join(',') + ')');
      sql.merge('ON');
      sql.merge('(MT.\"' + id + '\" = VT.\"' + id + '\")');
      sql.merge('WHEN NOT MATCHED THEN INSERT (' +
      fieldNames.join(',') + ')');

      var values = ParameterizedSQL.join(columnValues, ',');
      values.sql = 'VALUES(' + values.sql + ')';
      sql.merge(values);
    } else {
      sql.merge(this.buildInsertDefaultValues(model, data, options));
    }

    sql.merge('WHEN MATCHED THEN UPDATE SET');

    setValues = [];
    for (i = 0, n = fields.names.length; i < n; i++) {
      if (!fields.properties[i].id) {
        setValues.push(new ParameterizedSQL(fields.names[i] + '=' +
          '(' + columnValues[i].sql + ')', columnValues[i].params));
      }
    }

    sql.merge(ParameterizedSQL.join(setValues, ','));

    this.execute(sql.sql, sql.params, options, function(err, info) {
      if (!err && info && info.insertId) {
        data.id = info.insertId;
      }
      var meta = {};
      if (info) {
        // When using the INSERT ... ON DUPLICATE KEY UPDATE statement,
        // the returned value is as follows:
        // 1 for each successful INSERT.
        // 2 for each successful UPDATE.
        meta.isNewInstance = (info.affectedRows === 1);
      }

      callback(err, data, meta);
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
  var stmt = this.buildDelete(model, where, options);
  var id = this.idName(model);
  var sql = 'SELECT \"' + id + '\" FROM OLD TABLE (' + stmt.sql + ')';
  this.execute(sql, stmt.params, options, function(err, info) {
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
  var sql =
      'BEGIN\nDECLARE CONTINUE HANDLER FOR SQLSTATE \'42704\'\n' +
      'BEGIN END;\nEXECUTE IMMEDIATE \'DROP TABLE ' +
      this.table(model) + '\';\nEND';
  this.execute(sql, cb);
};

DB2.prototype.createTable = function(model, cb) {
  var sql = 'CREATE TABLE ' + this.schema + '.' + this.table(model) +
      ' (\n  ' + this.buildColumnDefinitions(model) + '\n)';
  this.execute(sql, cb);
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
  return sql.join(',\n  ');
};

DB2.prototype.buildColumnDefinition = function(model, prop) {
  var p = this.getModelDefinition(model).properties[prop];
  if (p.id && p.generated) {
    return 'INT NOT NULL GENERATED BY DEFAULT' +
      ' AS IDENTITY (START WITH 1 INCREMENT BY 1)';
  }
  var line = this.columnDataType(model, prop) + ' ' +
      (this.isNullable(p) ? 'NULL' : 'NOT NULL');
  return line;
};

DB2.prototype.columnDataType = function(model, property) {
  var columnMetadata = this.columnMetadata(model, property);
  var colType = columnMetadata && columnMetadata.dataType;
  if (colType) {
    colType = colType.toUpperCase();
  }
  var prop = this.getModelDefinition(model).properties[property];
  if (!prop) {
    return null;
  }
  var colLength = columnMetadata && columnMetadata.dataLength ||
      prop.length || prop.limit;
  if (colType && colLength) {
    return colType + '(' + colLength + ')';
  }
  return this.buildColumnType(prop);
};

DB2.prototype.buildColumnType = function buildColumnType(propertyDefinition) {
  var dt = '';
  var p = propertyDefinition;
  switch (p.type.name) {
    default:
    case 'JSON':
    case 'Object':
    case 'Any':
    case 'Text':
      dt = columnType(p, 'VARCHAR');
      dt = stringOptionsByType(p, dt);
      break;
    case 'String':
      dt = columnType(p, 'VARCHAR');
      dt = stringOptionsByType(p, dt);
      break;
    case 'Number':
      dt = columnType(p, 'INT');
      break;
    case 'Date':
      dt = columnType(p, 'TIMESTAMP');
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

function columnType(p, defaultType) {
  var dt = defaultType;
  if (p.dataType) {
    dt = String(p.dataType);
  }
  return dt;
}

function stringOptionsByType(p, columnType) {
  switch (columnType.toLowerCase()) {
    default:
    case 'varchar':
      // The maximum length for an ID column is 1000 bytes
      // The maximum row size is 64K
      var len = p.length || p.limit ||
        ((p.type !== String) ? 4096 : p.id ? 255 : 512);
      columnType += '(' + len + ')';
      break;
    case 'char':
      len = p.length || p.limit || 255;
      columnType += '(' + len + ')';
      break;
    case 'text':
    case 'tinytext':
    case 'mediumtext':
    case 'longtext':
      break;
  }
  columnType = stringOptions(p, columnType);
  return columnType;
}

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
