'use strict';

require('./test/init.js');

var async = require('async');
var _ = require('lodash');

var db = global.getDataSource();
var schemaName = global.config.schema;
var findTables = `SELECT TABNAME FROM SYSCAT.TABLES WHERE TABSCHEMA = 
  '${schemaName}' and type='T';`;
var findViews = `SELECT TABNAME FROM SYSCAT.TABLES WHERE TABSCHEMA = 
  '${schemaName}' and type='V';`;

if (!process.env.CI)
  return console.log('Skipping post-test ...');
console.log('> Cleaning up the database ...');

async.series([
  function dropViews(cb) {
    db.connector.execute(findViews, function(err, views) {
      async.each(views, dropView, cb);
    });
  },
  function dropTables(cb) {
    db.connector.execute(findTables, function(err, tables) {
      async.each(tables, dropTable, cb);
    });
  },
  function dropSchema(cb) {
    db.connector.execute('DROP SCHEMA "' + schemaName +
        '" RESTRICT;', cb);
  },
], function(err) {
  if (err) throw err;
  console.log('> Dropped schema: ' + schemaName);
  console.log('> Clean up completed.');
});

function dropView(view, cb) {
  var viewName = view.TABNAME;
  db.connector.execute(`DROP VIEW 
    "${schemaName}"."${viewName}";`, function(err, result) {
    cb(err);
  });
}

function dropTable(table, cb) {
  var tableName = table.TABNAME;
  db.connector.execute(`DROP TABLE 
    "${schemaName}"."${tableName}";`, function(err, result) {
    cb(err);
  });
}
