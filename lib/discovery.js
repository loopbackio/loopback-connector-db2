// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-db2
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var g = require('./globalize');
module.exports = mixinDiscovery;

/**
* @param {DB2} DB2 connector class
* @param {Object} db2
*/
function mixinDiscovery(DB2, db2) {
  var async = require('async');

  DB2.prototype.paginateSQL = function(sql, orderBy, options) {
    options = options || {};
    var limitClause = '';
    if (options.offset || options.skip || options.limit) {
      // Offset starts from 0
      var offset = Number(options.offset || options.skip || 0);
      if (isNaN(offset)) {
        offset = 0;
      }
      if (options.limit) {
        var limit = Number(options.limit);
        if (isNaN(limit)) {
          limit = 0;
        }
        limitClause = ' FETCH FIRST ' + limit + ' ROWS ONLY';
      }
    }
    if (!orderBy) {
      sql += ' ORDER BY ' + orderBy;
    }

    // return sql + limitClause;
    return sql + limitClause;
  };

  /**
   * Build sql for listing schemas (databases in DB2)
   *
   * @param {Object} [options]
   * @returns {string} sql
   */
  DB2.prototype.buildQuerySchemas = function(options) {
    var sql = 'SELECT definer AS "catalog",' +
      ' TRIM(schemaname) AS "schema"' +
      ' FROM syscat.schemata';

    return this.paginateSQL(sql, 'schema_name', options);
  };

  /**
   * Build sql for listing tables
   *
   * @param {Object} options
   * @returns {string} sql
   */
  DB2.prototype.buildQueryTables = function(options) {
    var sqlTables = null;
    var schema = options.owner || options.schema;

    if (options.all && !schema) {
      sqlTables = this.paginateSQL('SELECT \'table\' AS "type",' +
        ' TRIM(tabname) AS "name",' +
        ' TRIM(tabschema) AS "owner",' +
        ' TRIM(property) AS "property"' +
        ' FROM syscat.tables where substr(property,20,1) NOT LIKE \'Y\'',
      'table_schema, table_name', options);
    } else if (schema) {
      sqlTables = this.paginateSQL('SELECT \'table\' AS "type",' +
        ' TRIM(tabname) AS "name",' +
        ' TRIM(tabschema) AS "schema",' +
        ' TRIM(property) AS "property"' +
        ' FROM syscat.tables' +
        ' WHERE tabschema=\'' + schema + '\' AND' +
        ' SUBSTR(property, 20, 1) NOT LIKE \'Y\'',
      'table_schema, table_name', options);
    } else {
      sqlTables = this.paginateSQL('SELECT \'table\' AS "type",' +
        ' TRIM(tabname) AS "name", ' +
        ' TRIM(tabschema) AS "owner",' +
        ' TRIM(property) AS "property" FROM syscat.tables' +
        ' WHERE tabschema = CURRENT USER AND' +
        ' SUBSTR(property, 20, 1) NOT LIKE \'Y\'',
      'tabname', options);
    }

    return sqlTables;
  };

  /**
   * Build sql for listing views
   *
   * @param {Object} options
   * @returns {string} sql
   */
  DB2.prototype.buildQueryViews = function(options) {
    var sqlViews = null;
    if (options.views) {
      var schema = options.owner || options.schema;

      if (options.all && !schema) {
        sqlViews = this.paginateSQL('SELECT \'view\' AS "type",' +
          ' TRIM(tabname) AS "name",' +
          ' TRIM(tabschema) AS "owner"' +
          ' FROM syscat.tables',
        'tabschema, tabname', options);
      } else if (schema) {
        sqlViews = this.paginateSQL('SELECT \'view\' AS "type",' +
          ' TRIM(tabname) AS "name",' +
          ' TRIM(tabschema) AS "owner"' +
          ' FROM syscat.tables' +
          ' WHERE tabschema=\'' + schema + '\'',
        'tabschema, tabname', options);
      } else {
        sqlViews = this.paginateSQL('SELECT \'view\' AS "type",' +
          ' TRIM(tabname) AS "name",' +
          ' TRIM(tabschema) AS "owner"' +
          ' FROM syscat.tables',
        'tabname', options);
      }
    }

    return sqlViews;
  };

  /**
   * Normalize the arguments
   *
   * @param {string} table
   * @param {Object} [options]
   * @param {Function} [cb]
   */
  DB2.prototype.getArgs = function(table, options, cb) {
    // if ('string' !== (typeof table || !table)) {
    //   throw new Error('table is a required string argument: ' + table);
    // }
    options = options || {};
    // if (!cb && 'function' === (typeof options)) {
    //   cb = options;
    //   options = {};
    // }
    if (typeof options !== 'object') {
      throw new Error(g.f('options must be an {{object}}: %s', options));
    }

    return {
      schema: options.owner || options.schema,
      table: table,
      options: options,
      cb: cb,
    };
  };

  /**
   * Build the sql statement to query columns for a given table
   *
   * @param {string} schema
   * @param {string} table
   * @returns {string} The sql statement
   */
  DB2.prototype.buildQueryColumns = function(schema, table) {
    var sql = null;
    if (schema) {
      sql = this.paginateSQL('SELECT TRIM(tabschema) AS "owner",' +
        ' TRIM(tabname) AS "tableName",' +
        ' TRIM(colname) AS "columnName",' +
        ' typename AS "dataType",' +
        ' length AS "dataLength",' +
        ' scale AS "dataScale",' +
        ' (CASE WHEN nulls = \'Y\' THEN 1 ELSE 0 END) AS "nullable"' +
        ' FROM syscat.columns' +
        ' WHERE tabschema = \'' + schema + '\'' +
        (table ? ' AND tabname = \'' + table + '\'' : ''),
      'tabname, colno', {});
    } else {
      sql = this.paginateSQL('SELECT TRIM(tabschema) AS "owner",' +
        ' TRIM(tabname) AS "tableName",' +
        ' TRIM(colname) AS "columnName",' +
        ' typename AS "dataType",' +
        ' length AS "dataLength",' +
        ' scale AS "dataScale",' +
        ' (CASE WHEN nulls = \'Y\' THEN 1 ELSE 0 END) AS "nullable"' +
        ' FROM syscat.columns' +
        (table ? ' WHERE tabname="' + table + '"' : ''),
      'tabname, ordinal_position', {});
    }

    return sql;
  };

  /**
   * Build the sql statement for querying primary keys of a given table
   *
   * @param {string} schema
   * @param {string} table
   * @returns {string}
   */
  DB2.prototype.buildQueryPrimaryKeys = function(schema, table) {
    var sql = 'SELECT TRIM(tabschema) AS "owner",' +
      ' TRIM(tabname) AS "tableName",' +
      ' TRIM(colname) AS "columnName",' +
      ' colseq AS "keySeq",' +
      ' constname AS "pkName"' +
      ' FROM syscat.keycoluse' +
      ' WHERE colseq IS NOT NULL AND colseq > 0';

    if (schema) {
      sql += ' AND tabschema = \'' + schema + '\'';
    }
    if (table) {
      sql += ' AND tabname = \'' + table + '\'';
    }
    sql += ' ORDER BY' +
      ' tabschema, constname, tabname, colseq';

    return sql;
  };

  /**
   * Build the sql statement for querying foreign keys of a given table
   *
   * @param {string} schema
   * @param {string} table
   * @returns {string}
   */
  DB2.prototype.buildQueryForeignKeys = function(schema, table) {
    var sql =
      'SELECT TRIM(tabschema) AS "fkOwner",' +
      ' TRIM(constname) AS "fkName",' +
      ' TRIM(tabname) AS "fkTableName",' +
      ' TRIM(reftabschema) AS "pkOwner", \'PRIMARY\' AS "pkName",' +
      ' TRIM(reftabname) AS "pkTableName",' +
      ' TRIM(refkeyname) AS "pkColumnName"' +
      ' FROM syscat.references';

    if (schema || table) {
      sql += ' WHERE';
      if (schema) {
        sql += ' tabschema = \'' + schema + '\'';
      }
      if (table) {
        sql += ' AND tabname LIKE \'' + table + '\'';
      }
    }

    return sql;
  };

  /**
   * Retrieves a description of the foreign key columns that reference the
   *
   * given table's primary key columns (the foreign keys exported by a table).
   * They are ordered by fkTableOwner, fkTableName, and keySeq.
   *
   * @param {string} schema
   * @param {string} table
   * @returns {string}
   */
  DB2.prototype.buildQueryExportedForeignKeys = function(schema, table) {
    var sql = 'SELECT TRIM(a.constraint_name) AS "fkName",' +
      ' TRIM(a.tabschema) AS "fkOwner",' +
      ' TRIM(a.tabname) AS "fkTableName",' +
      ' TRIM(a.colname) AS "fkColumnName",' +
      ' NULL AS "pkName",' +
      ' TRIM(a.referenced_table_schema) AS "pkOwner",' +
      ' TRIM(a.referenced_table_name) AS "pkTableName",' +
      ' TRIM(a.referenced_column_name) AS "pkColumnName"' +
      ' FROM information_schema.key_column_usage a' +
      ' WHERE a.position_in_unique_constraint IS NOT NULL';
    if (schema) {
      sql += ' AND a.referenced_table_schema="' + schema + '"';
    }
    if (table) {
      sql += ' AND a.referenced_table_name="' + table + '"';
    }
    sql += ' ORDER BY a.table_schema, a.table_name, a.ordinal_position';

    return sql;
  };

  DB2.prototype.buildPropertyType = function(columnDefinition) {
    var dataType = columnDefinition.dataType;
    var dataLength = columnDefinition.dataLength;

    var type = dataType.toUpperCase();
    switch (type) {
      case 'CHAR':
        if (dataLength === 1) {
          // Treat char(1) as boolean
          return 'Boolean';
        } else {
          return 'String';
        }
        break;
      case 'VARCHAR':
      case 'TINYTEXT':
      case 'MEDIUMTEXT':
      case 'LONGTEXT':
      case 'TEXT':
      case 'ENUM':
      case 'SET':
        return 'String';
      case 'TINYBLOB':
      case 'MEDIUMBLOB':
      case 'LONGBLOB':
      case 'BLOB':
      case 'BINARY':
      case 'VARBINARY':
      case 'BIT':
        return 'Binary';
      case 'TINYINT':
      case 'SMALLINT':
      case 'INT':
      case 'INTEGER':
      case 'MEDIUMINT':
      case 'YEAR':
      case 'FLOAT':
      case 'DOUBLE':
      case 'BIGINT':
        return 'Number';
      case 'DATE':
      case 'TIMESTAMP':
      case 'DATETIME':
        return 'Date';
      case 'POINT':
        return 'GeoPoint';
      default:
        return 'String';
    }
  };

  DB2.prototype.getDefaultSchema = function() {
    return process.env['USER'];
    // if (this.dataSource && this.dataSource.settings &&
    //   this.dataSource.settings.database) {
    //   return this.dataSource.settings.database;
    // }
    // return undefined;
  };

  DB2.prototype.setDefaultOptions = function(options) {

  };

  DB2.prototype.setNullableProperty = function(r) {
    r.nullable = r.nullable ? 'Y' : 'N';
  };
}
