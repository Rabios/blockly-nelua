/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Nelua for procedure blocks.
 * @author rodrigoq@google.com (Rodrigo Queiro)
 */
'use strict';

goog.provide('Blockly.Nelua.procedures');

goog.require('Blockly.Nelua');


Blockly.Nelua['procedures_defreturn'] = function(block) {
  // Define a procedure with a return value.
  var funcName = Blockly.Nelua.nameDB_.getName(
      block.getFieldValue('NAME'), Blockly.PROCEDURE_CATEGORY_NAME);
  var xfix1 = '';
  if (Blockly.Nelua.STATEMENT_PREFIX) {
    xfix1 += Blockly.Nelua.injectId(Blockly.Nelua.STATEMENT_PREFIX, block);
  }
  if (Blockly.Nelua.STATEMENT_SUFFIX) {
    xfix1 += Blockly.Nelua.injectId(Blockly.Nelua.STATEMENT_SUFFIX, block);
  }
  if (xfix1) {
    xfix1 = Blockly.Nelua.prefixLines(xfix1, Blockly.Nelua.INDENT);
  }
  var loopTrap = '';
  if (Blockly.Nelua.INFINITE_LOOP_TRAP) {
    loopTrap = Blockly.Nelua.prefixLines(
        Blockly.Nelua.injectId(Blockly.Nelua.INFINITE_LOOP_TRAP, block),
        Blockly.Nelua.INDENT);
  }
  var branch = Blockly.Nelua.statementToCode(block, 'STACK');
  var returnValue = Blockly.Nelua.valueToCode(block, 'RETURN',
      Blockly.Nelua.ORDER_NONE) || '';
  var xfix2 = '';
  if (branch && returnValue) {
    // After executing the function body, revisit this block for the return.
    xfix2 = xfix1;
  }
  if (returnValue) {
    returnValue = Blockly.Nelua.INDENT + 'return ' + returnValue + '\n';
  } else if (!branch) {
    branch = '';
  }
  var args = [];
  var variables = block.getVars();
  for (var i = 0; i < variables.length; i++) {
    args[i] = Blockly.Nelua.nameDB_.getName(variables[i],
        Blockly.VARIABLE_CATEGORY_NAME);
  }
  var code = 'local function ' + funcName + '(' + args.join(', ') + ')\n' +
      xfix1 + loopTrap + branch + xfix2 + returnValue + 'end\n';
  code = Blockly.Nelua.scrub_(block, code);
  // Add % so as not to collide with helper functions in definitions list.
  Blockly.Nelua.definitions_['%' + funcName] = code;
  return null;
};

// Defining a procedure without a return value uses the same generator as
// a procedure with a return value.
Blockly.Nelua['procedures_defnoreturn'] =
    Blockly.Nelua['procedures_defreturn'];

Blockly.Nelua['procedures_callreturn'] = function(block) {
  // Call a procedure with a return value.
  var funcName = Blockly.Nelua.nameDB_.getName(
      block.getFieldValue('NAME'), Blockly.PROCEDURE_CATEGORY_NAME);
  var args = [];
  var variables = block.getVars();
  for (var i = 0; i < variables.length; i++) {
    args[i] = Blockly.Nelua.valueToCode(block, 'ARG' + i,
        Blockly.Nelua.ORDER_NONE) || 'nil';
  }
  var code = funcName + '(' + args.join(', ') + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['procedures_callnoreturn'] = function(block) {
  // Call a procedure with no return value.
  // Generated code is for a function call as a statement is the same as a
  // function call as a value, with the addition of line ending.
  var tuple = Blockly.Nelua['procedures_callreturn'](block);
  return tuple[0] + '\n';
};

Blockly.Nelua['procedures_ifreturn'] = function(block) {
  // Conditionally return value from a procedure.
  var condition = Blockly.Nelua.valueToCode(block, 'CONDITION',
      Blockly.Nelua.ORDER_NONE) || 'false';
  var code = 'if ' + condition + ' then\n';
  if (Blockly.Nelua.STATEMENT_SUFFIX) {
    // Inject any statement suffix here since the regular one at the end
    // will not get executed if the return is triggered.
    code += Blockly.Nelua.prefixLines(
        Blockly.Nelua.injectId(Blockly.Nelua.STATEMENT_SUFFIX, block),
        Blockly.Nelua.INDENT);
  }
  if (block.hasReturnValue_) {
    var value = Blockly.Nelua.valueToCode(block, 'VALUE',
        Blockly.Nelua.ORDER_NONE) || 'nil';
    code += Blockly.Nelua.INDENT + 'return ' + value + '\n';
  } else {
    code += Blockly.Nelua.INDENT + 'return\n';
  }
  code += 'end\n';
  return code;
};
