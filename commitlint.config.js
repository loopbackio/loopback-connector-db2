// SPDX-FileCopyrightText: Copyright IBM Corp. and LoopBack contributors 2017,2018. All Rights Reserved.
// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightNotice: <text>
// Node module: loopback-connector-db2
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
// </text>
'use strict';

const isCI = process.env.CI;

module.exports = {
  extends: [
    '@commitlint/config-conventional',
  ],
  rules: {
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [0, 'always'],
    // Only enforce the rule if CI flag is not set. This is useful for release
    // commits to skip DCO
    'signed-off-by': [isCI ? 0 : 2, 'always', 'Signed-off-by:'],
  },
};
