/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Nelua for dynamic variable blocks.
 * @author fenichel@google.com (Rachel Fenichel)
 */
'use strict';

goog.provide('Blockly.Nelua.variablesDynamic');

goog.require('Blockly.Nelua');
goog.require('Blockly.Nelua.variables');


// Nelua is dynamically typed.
Blockly.Nelua['variables_get_dynamic'] = Blockly.Nelua['variables_get'];
Blockly.Nelua['variables_set_dynamic'] = Blockly.Nelua['variables_set'];
