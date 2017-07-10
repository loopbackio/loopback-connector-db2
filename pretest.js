'use strict';

require('./test/init.js');

var async = require('async');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var db = global.getDataSource();
var schemaName = global.config.schema;
var template = path.resolve(__dirname, 'test', 'table.template');

if (!process.env.CI)
  return console.log('Skipping pre-test ...');
console.log('> Seeding the database ...');

var contents = fs.readFileSync(template, {encoding: 'utf-8'});
var lines = contents.trim().split(';');
var createViewCmd = `CREATE OR REPLACE VIEW "${schemaName}"."INVENTORY_VIEW" AS
  SELECT P.name AS product, L.name AS location, I.available FROM
    "${schemaName}"."INVENTORY" I,
    "${schemaName}"."PRODUCT" P,
    "${schemaName}"."LOCATION" L
    WHERE
    p.id = I.product_id AND l.id = I.location_id;`;

async.series([
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

function createTable(command, cb) {
  command = (command + ';').trim();
  if (command !== ';') {
    var cmd = command.replace(/"\?"/g, `"${schemaName}"`);
    db.connector.execute(cmd, cb);
  } else cb();
}
