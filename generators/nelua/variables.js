/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Nelua for variable blocks.
 * @author rodrigoq@google.com (Rodrigo Queiro)
 */
'use strict';

goog.provide('Blockly.Nelua.variables');

goog.require('Blockly.Nelua');


Blockly.Nelua['variables_get'] = function(block) {
  // Variable getter.
  var code = Blockly.Nelua.nameDB_.getName(block.getFieldValue('VAR'),
      Blockly.VARIABLE_CATEGORY_NAME);
  return [code, Blockly.Nelua.ORDER_ATOMIC];
};

Blockly.Nelua['variables_set'] = function(block) {
  // Variable setter.
  var argument0 = Blockly.Nelua.valueToCode(block, 'VALUE',
      Blockly.Nelua.ORDER_NONE) || '0';
  var varName = Blockly.Nelua.nameDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  return 'local ' + varName + ' = ' + argument0 + '\n';
};
