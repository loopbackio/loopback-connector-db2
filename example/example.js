var DataSource = require('loopback-datasource-juggler').DataSource;
var DB2 = require('../'); // loopback-connector-db2

var config = {
  username: process.env.DB2_USERNAME,
  password: process.env.DB2_PASSWORD,
  hostname: process.env.DB2_HOSTNAME,
  port: 50000,
  database: 'SQLDB',
};

var db = new DataSource(DB2, config);

var User = db.define('User', {name: {type: String}, email: {type: String},
});

db.autoupdate('User', function(err) {
  if (err) {
    console.log(err);
    return;
  }

  User.create({
    name: 'Tony',
    email: 'tony@t.com',
  }, function(err, user) {
    console.log(err, user);
  });

  User.find({where: {name: 'Tony'}}, function(err, users) {
    console.log(err, users);
  });

  User.destroyAll(function() {
    console.log('example complete');
  });
});
