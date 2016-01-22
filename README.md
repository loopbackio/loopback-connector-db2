## loopback-connector-db2

IBM DB2 connector for the StrongLoop Loopback framework.

Please see the full documentation at [docs.strongloop.com](https://docs.strongloop.com/display/public/LB/DB2+connector)

### Key Features

* Supports all CRUD operations
* [Loopback Query](https://docs.strongloop.com/display/public/LB/Querying+data) support for: fields, limit, order, skip and where filters

### Work In Progress

* Model discovery
* Auto migration and update

### LoopBack Connectors

LoopBack provides connectors for popular relational and NoSQL databases.
These connectors implement CRUD operations as a common set of methods
across different databases and allow quick and easy API creation for new
or existing datasources.

[More Info>>](https://www.ng.bluemix.net/docs/starters/LoopBack/index.html)

### IBM DB2

IBM database of choice for robust, enterprise-wide solutions handling high-volume workloads

[More Info>>](http://www-01.ibm.com/software/data/db2)

### Install

To install the connector cd into the top level directory of your
loopback application, enter:

```
$ npm install loopback-connector-db2 --save
```

The --save options automatically as the dependency to the package.json
file

### Configuring the DB2 datasource

Use the [Data source generator](https://docs.strongloop.com/display/public/LB/Data+source+generator) to add the DB2 data source to your
application. The entry in the applications /server/datasources.json will
look something like this:

```
"mydb": {
  "name": "mydb",
  "connector": "db2",
  "username": <username>,
  "password": <password>,
  "database": <database name>,
  "hostname": <db2 server hostname>,
  "port":     <port number>
}
```

Edit the datasources.json to add other supported properties as required:

Property       | Type    | Description
---------------| --------| --------
database       | String  | Database name
schema         | String  | Specifies the default schema name that is used to qualify unqualified database objects in dynamically prepared SQL statements. The value of this property sets the value in the CURRENT SCHEMA special register on the database server. The schema name is case-sensitive, and must be specified in uppercase characters
username       | String  | DB2 Username
password       | String  | DB2 password associated with the username above
hostname       | String  | DB2 server hostname or IP address
port           | String  | DB2 server TCP port number
useLimitOffset | Boolean | LIMIT and OFFSET must be configured on the DB2 server before use (compatibility mode)


### Example Usage

```
var DataSource = require('loopback-datasource-juggler').DataSource;
var DB2 = require('loopback-connector-db2');

var config = {
  username: process.env.DB2_USERNAME,
  password: process.env.DB2_PASSWORD,
  hostname: process.env.DB2_HOSTNAME,
  port: 50000,
  database: 'SQLDB',
};

var db = new DataSource(DB2, config);

var User = db.define('User', {
  name: { type: String },
  email: { type: String },
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

  User.find({ where: { name: 'Tony' }}, function(err, users) {
    console.log(err, users);
  });

  User.destroyAll(function() {
    console.log('example complete');
  });
});
```
