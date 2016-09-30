// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-connector-db2
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

var path = require('path');
var SG = require('strong-globalize');

SG.SetRootDir(path.join(__dirname, '..'), {autonomousMsgLoading: 'all'});
module.exports = SG();
