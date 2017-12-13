2017-12-13, Version 2.1.1
=========================

 * fixup: parse affectedRows into Numbers (Kevin Delisle)

 * Use count for update/delete (Quentin Presley)

 * chore:update license (Diana Lau)


2017-10-13, Version 2.1.0
=========================

 * update strong-globalize to 3.1.0 (shimks)

 * Add stalebot configuration (Kevin Delisle)

 * Create Issue and PR Templates (#118) (Sakib Hasan)

 * Clean up old schemas in pretest (ssh24)

 * Revert "Run posttest even when test fails" (Sakib Hasan)

 * Update translated strings Q3 2017 (Allen Boone)

 * update messages.json (Diana Lau)

 * Add CODEOWNER file (Diana Lau)

 * Run posttest even when test fails (ssh24)

 * Add tests on autoupdate (ssh24)

 * Fix repo name env variable (ssh24)

 * Fix db2 CI (ssh24)

 * Fix linting issues (harsh_sanjanwala)

 * Fix lint errors (harsh_sanjanwala)

 * Added enhanced check (swapnil-girme)

 * Adding Test Case (swapnil-girme)

 * updated discovery.js for relations issue (sontarge)

 * Adding asserts (swapnil-girme)

 * Adding unit test cases (Harsh Sanjanwala)

 * Update discovery.js (pooja-kothari)

 * Replicate new issue_template from loopback (Siddhi Pai)

 * Replicate issue_template from loopback repo (Siddhi Pai)

 * Require init on mocha args (Candy)

 * Add docker setup (ssh24)

 * DB2 with Docker (Andre Fernandes)


2017-04-11, Version 2.0.0
=========================

 * Remove debug logging of conn details (#95) (Quentin Presley)

 * package: use loopback-ibmdb@2.2.0 (Kevin Delisle)

 * Upgrade to loopback-connector@4.0.0 (jannyHou)

 * Remove lib/migration and require calls (ssh24)

 * Putback an empty lib/migration file (ssh24)

 * Remove lib/migration (ssh24)

 * move isActual func to base connector (biniam)

 * Extract out alterTable function (ssh24)

 * Extract autoupdate and getTableStatus function (ssh24)

 * Add showFields and showIndexes as functions (ssh24)


2017-03-01, Version 2.0.0-alpha
===============================

 * package: update to loopback-ibmdb@2.x (Kevin Delisle)

 * Refactor discovery (jannyHou)

 * Update README.md (Rand McKinney)

 * Update README to use lb3 datasource generator (ivy ho)

 * Update LB connector version (Loay)

 * Update paid support URL (Siddhi Pai)

 * Start 3.x + drop support for Node v0.10/v0.12 (siddhipai)

 * Drop support for Node v0.10 and v0.12 (Siddhi Pai)

 * Start the development of the next major version (Siddhi Pai)

 * Add translation files (Candy)

 * Readd the testing env steps in readme (Loay)

 * Use setIsolationLevel (#70) (Quentin Presley)


2016-11-03, Version 1.0.21
==========================

 * Remove lazy connect (#69) (Quentin Presley)

 * Update README with correct doc links, etc (crandmck)

 * Setup testing Environement (Loay)

 * Remove extraneous properties (#64) (Quentin Presley)

 * Fix linting errors (#62) (Simon Ho)

 * Add connectorCapabilities global object (Nick Duffy)

 * Fix linting issues (Loay)

 * update (Loay)

 * Use globalization new format 2 (Loay)

 * Use globalization new format (Loay)

 * test: eager load connector (Ryan Graham)

 * Add globalization (Loay)

 * Remove Makefile in favour of NPM scripts (Simon Ho)

 * Skip tests to fix CI (Simon Ho)

 * Use LoopBack ESLint configs (Simon Ho)

 * Update ESLint config (Simon Ho)

 * Update deps to loopback 3.0.0 RC (Miroslav Bajtoš)

 * Remove CurrentSchema (Quentin Presley)

 * Run CI with juggler3 (Loay)


2016-08-19, Version 1.0.20
==========================

 * Change idName to idColumn (#47) (Quentin Presley)


2016-08-18, Version 1.0.19
==========================

 * Stability fixes (#44) (Quentin Presley)


2016-08-05, Version 1.0.18
==========================

 * Update Date test to return error (Quentin Presley)

 * update based on comments (Quentin Presley)

 * Use TRIM to remove whitespace in column names (Quentin Presley)

 * Update README.md (Rand McKinney)

 * Update URLs in CONTRIBUTING.md (#40) (Ryan Graham)

 * Update loopback-ibmdb version (Quentin Presley)

 * Change to loopback-ibmdb (Quentin Presley)

 * Move majority of function to loopback-ibmdb (Quentin Presley)

 * Fix index.js exports (Quentin Presley)

 * Initial attempt to componentize IBM connectors (Quentin Presley)

 * Update README.md (Quentin Presley)


2016-05-13, Version 1.0.17
==========================

 * Fix done (jannyHou)

 * Check dsn in config before throw error (jannyHou)

 * Remove duplicate error emit (jannyHou)

 * Lazy connect when app booting from swagger generator (juehou)

 * update copyright notices and license (Ryan Graham)

 * Add DB2 z/OS support (Quentin Presley)


2016-04-07, Version 1.0.14
==========================

 * Updated ping to test SQL (Quentin Presley)

 * Add ping function (Quentin Presley)

 * Add SQL file for dashDB (Quentin Presley)

 * properly identify missing credentials (Sai Vennam)

 * Change test command back (juehou)

 * Use dsn to override other settings if dsn provided (juehou)


2016-03-23, Version 1.0.13
==========================

 * Update schema to default to this.username (Quentin Presley)


2016-03-16, Version 1.0.12
==========================



2016-03-16, Version 1.0.11
==========================

 * Fix support for downlevel DB2 versions (Quentin Presley)


2016-03-15, Version 1.0.10
==========================



2016-03-15, Version 1.0.9
=========================

 * Add dashDB support (Quentin Presley)


2016-03-09, Version 1.0.8
=========================

 * Update migration to support connector specific properties stanza (Quentin Presley)


2016-03-06, Version 1.0.7
=========================



2016-03-06, Version 1.0.6
=========================

 * Remove commented out line in transaction.js (Quentin Presley)

 * Add transaction support and tests (Quentin Presley)


2016-03-02, Version 1.0.5
=========================

 * updating settings for user in connection string (Quentin Presley)


2016-02-29, Version 1.0.4
=========================

 * fix connection string (Quentin Presley)

 * update connection string setup (Quentin Presley)


2016-02-25, Version 1.0.3
=========================

 * Fix for hasMany tests (Quentin Presley)

 * clean up console.log in db2.js (Quentin Presley)

 * Update migration tests (Quentin Presley)

 * Remove more commented out lines (Quentin Presley)

 * Remove commented out lines in migration.js (Quentin Presley)

 * Add tests for discovery (Quentin Presley)

 * Adding discovery/migration/transaction (Quentin Presley)


2016-01-31, Version 1.0.2
=========================

 * Update IBM DB2 driver. Resolves node v0.10 build issues (Anthony Ffrench)

 * update ibm_db level #9 (Quentin Presley)

 * update ibm_db to 0.18 remove mocha testcase filters (Anthony Ffrench)

 * changes for issue 7 (Quentin Presley)

 * skip a few testcases that are dependent on fixes to ibm_db (Anthony Ffrench)

 * add bluebird to devDeps list (Anthony Ffrench)

 * Update README.md (Rand McKinney)

 * Add title (crandmck)

 * Initial edits of README (crandmck)

 * Update package.json an init.js (Quentin Presley)

 * Fix up some lint/test issues (Quentin Presley)

 * Add settings.schema to the default schema name that is used to qualify unqualified database objects. closes #2 (Anthony Ffrench)


2016-01-20, Version 1.0.1
=========================

 * fix another hardcoded id case vs model.idName (Anthony Ffrench)

 * update <dot>gitignore add <dot>npmignore (Anthony Ffrench)


2016-01-20, Version 1.0.0
=========================

 * First release!
