'use strict';

require('./test/init.js');

const async = require('async');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const db = global.getDataSource();
const schemaName = global.config.schema;
const template = path.resolve(__dirname, 'test', 'table.template');

if (!process.env.CI)
  return console.log('Skipping pre-test ...');
console.log('> Seeding the database ...');

const listSchemaCmd = `SELECT SCHEMANAME FROM SYSCAT.SCHEMATA WHERE 
  SCHEMANAME LIKE 'SCHEMA%_DB2_%_%'`;
const createViewCmd = `CREATE OR REPLACE VIEW "${schemaName}"."INVENTORY_VIEW" 
  AS SELECT P.name AS product, L.name AS location, I.available FROM
  "${schemaName}"."INVENTORY" I,
  "${schemaName}"."PRODUCT" P,
  "${schemaName}"."LOCATION" L
  WHERE
  p.id = I.product_id AND l.id = I.location_id;`;

const contents = fs.readFileSync(template, {encoding: 'utf-8'});
const lines = contents.trim().split(';');

async.series([
  function dropExistingSchemas(cb) {
    db.connector.execute(listSchemaCmd, function(err, schema) {
      if (err) cb(err);
      console.log('> Cleaning up existing schemas ...');
      async.each(schema, dropSchema, cb);
    });
  },
  function createSchema(cb) {
    db.connector.execute(`CREATE SCHEMA "${schemaName}";`, function(err) {
      if (err) cb(err);
      console.log('> Created schema: ' + schemaName);
      cb(err);
    });
  },
  function createTables(cb) {
    async.each(lines, createTable, cb);
  },
  function createView(cb) {
    db.connector.execute(createViewCmd, cb);
  },
], function(err) {
  if (err) throw err;
  console.log('> Done seeding the database.');
});

function dropSchema(schema, cb) {
  schema = schema['SCHEMANAME'];

  const findTables = `SELECT TABNAME FROM SYSCAT.TABLES WHERE TABSCHEMA = 
    '${schema}' and type='T';`;
  const findViews = `SELECT TABNAME FROM SYSCAT.TABLES WHERE TABSCHEMA = 
    '${schema}' and type='V';`;

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
      db.connector.execute('DROP SCHEMA "' + schema +
        '" RESTRICT;', cb);
    },
  ], function(err) {
    cb(err);
  });

  function dropView(view, cb) {
    const viewName = view.TABNAME;
    db.connector.execute(`DROP VIEW 
      "${schema}"."${viewName}";`, function(err, result) {
      cb(err);
    });
  };

  function dropTable(table, cb) {
    const tableName = table.TABNAME;
    db.connector.execute(`DROP TABLE 
      "${schema}"."${tableName}";`, function(err, result) {
      cb(err);
    });
  };
};

function createTable(command, cb) {
  command = (command + ';').trim();
  if (command !== ';') {
    const cmd = command.replace(/"\?"/g, `"${schemaName}"`);
    db.connector.execute(cmd, cb);
  } else cb();
};
