/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Nelua for logic blocks.
 * @author rodrigoq@google.com (Rodrigo Queiro)
 */
'use strict';

goog.provide('Blockly.Nelua.logic');

goog.require('Blockly.Nelua');


Blockly.Nelua['controls_if'] = function(block) {
  // If/elseif/else condition.
  var n = 0;
  var code = '', branchCode, conditionCode;
  if (Blockly.Nelua.STATEMENT_PREFIX) {
    // Automatic prefix insertion is switched off for this block.  Add manually.
    code += Blockly.Nelua.injectId(Blockly.Nelua.STATEMENT_PREFIX, block);
  }
  do {
    conditionCode = Blockly.Nelua.valueToCode(block, 'IF' + n,
        Blockly.Nelua.ORDER_NONE) || 'false';
    branchCode = Blockly.Nelua.statementToCode(block, 'DO' + n);
    if (Blockly.Nelua.STATEMENT_SUFFIX) {
      branchCode = Blockly.Nelua.prefixLines(
          Blockly.Nelua.injectId(Blockly.Nelua.STATEMENT_SUFFIX, block),
          Blockly.Nelua.INDENT) + branchCode;
    }
    code += (n > 0 ? 'else' : '') +
        'if ' + conditionCode + ' then\n' + branchCode;
    ++n;
  } while (block.getInput('IF' + n));

  if (block.getInput('ELSE') || Blockly.Nelua.STATEMENT_SUFFIX) {
    branchCode = Blockly.Nelua.statementToCode(block, 'ELSE');
    if (Blockly.Nelua.STATEMENT_SUFFIX) {
      branchCode = Blockly.Nelua.prefixLines(
          Blockly.Nelua.injectId(Blockly.Nelua.STATEMENT_SUFFIX, block),
          Blockly.Nelua.INDENT) + branchCode;
    }
    code += 'else\n' + branchCode;
  }
  return code + 'end\n';
};

Blockly.Nelua['controls_ifelse'] = Blockly.Nelua['controls_if'];

Blockly.Nelua['logic_compare'] = function(block) {
  // Comparison operator.
  var OPERATORS = {
    'EQ': '==',
    'NEQ': '~=',
    'LT': '<',
    'LTE': '<=',
    'GT': '>',
    'GTE': '>='
  };
  var operator = OPERATORS[block.getFieldValue('OP')];
  var argument0 = Blockly.Nelua.valueToCode(block, 'A',
      Blockly.Nelua.ORDER_RELATIONAL) || '0';
  var argument1 = Blockly.Nelua.valueToCode(block, 'B',
      Blockly.Nelua.ORDER_RELATIONAL) || '0';
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, Blockly.Nelua.ORDER_RELATIONAL];
};

Blockly.Nelua['logic_operation'] = function(block) {
  // Operations 'and', 'or'.
  var operator = (block.getFieldValue('OP') == 'AND') ? 'and' : 'or';
  var order = (operator == 'and') ? Blockly.Nelua.ORDER_AND :
      Blockly.Nelua.ORDER_OR;
  var argument0 = Blockly.Nelua.valueToCode(block, 'A', order);
  var argument1 = Blockly.Nelua.valueToCode(block, 'B', order);
  if (!argument0 && !argument1) {
    // If there are no arguments, then the return value is false.
    argument0 = 'false';
    argument1 = 'false';
  } else {
    // Single missing arguments have no effect on the return value.
    var defaultArgument = (operator == 'and') ? 'true' : 'false';
    if (!argument0) {
      argument0 = defaultArgument;
    }
    if (!argument1) {
      argument1 = defaultArgument;
    }
  }
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Blockly.Nelua['logic_negate'] = function(block) {
  // Negation.
  var argument0 = Blockly.Nelua.valueToCode(block, 'BOOL',
      Blockly.Nelua.ORDER_UNARY) || 'true';
  var code = 'not ' + argument0;
  return [code, Blockly.Nelua.ORDER_UNARY];
};

Blockly.Nelua['logic_boolean'] = function(block) {
  // Boolean values true and false.
  var code = (block.getFieldValue('BOOL') == 'TRUE') ? 'true' : 'false';
  return [code, Blockly.Nelua.ORDER_ATOMIC];
};

Blockly.Nelua['logic_null'] = function(block) {
  // Null data type.
  return ['nil', Blockly.Nelua.ORDER_ATOMIC];
};

Blockly.Nelua['logic_ternary'] = function(block) {
  // Ternary operator.
  var value_if = Blockly.Nelua.valueToCode(block, 'IF',
      Blockly.Nelua.ORDER_AND) || 'false';
  var value_then = Blockly.Nelua.valueToCode(block, 'THEN',
      Blockly.Nelua.ORDER_AND) || 'nil';
  var value_else = Blockly.Nelua.valueToCode(block, 'ELSE',
      Blockly.Nelua.ORDER_OR) || 'nil';
  var code = value_if + ' and ' + value_then + ' or ' + value_else;
  return [code, Blockly.Nelua.ORDER_OR];
};
