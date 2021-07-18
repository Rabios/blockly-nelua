/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Nelua for loop blocks.
 * @author rodrigoq@google.com (Rodrigo Queiro)
 */
'use strict';

goog.provide('Blockly.Nelua.loops');

goog.require('Blockly.Nelua');


/**
 * This is the text used to implement a <pre>continue</pre>.
 * It is also used to recognise <pre>continue</pre>s in generated code so that
 * the appropriate label can be put at the end of the loop body.
 * @const {string}
 */
Blockly.Nelua.CONTINUE_STATEMENT = 'goto continue\n';

/**
 * If the loop body contains a "goto continue" statement, add a continue label
 * to the loop body. Slightly inefficient, as continue labels will be generated
 * in all outer loops, but this is safer than duplicating the logic of
 * blockToCode.
 *
 * @param {string} branch Generated code of the loop body
 * @return {string} Generated label or '' if unnecessary
 * @private
 */
Blockly.Nelua.addContinueLabel_ = function(branch) {
  if (branch.indexOf(Blockly.Nelua.CONTINUE_STATEMENT) != -1) {
    // False positives are possible (e.g. a string literal), but are harmless.
    return branch + Blockly.Nelua.INDENT + '::continue::\n';
  } else {
    return branch;
  }
};

Blockly.Nelua['controls_repeat_ext'] = function(block) {
  // Repeat n times.
  if (block.getField('TIMES')) {
    // Internal number.
    var repeats = String(Number(block.getFieldValue('TIMES')));
  } else {
    // External number.
    var repeats = Blockly.Nelua.valueToCode(block, 'TIMES',
        Blockly.Nelua.ORDER_NONE) || '0';
  }
  if (Blockly.isNumber(repeats)) {
    repeats = parseInt(repeats, 10);
  } else {
    repeats = 'math.floor(' + repeats + ')';
  }
  var branch = Blockly.Nelua.statementToCode(block, 'DO');
  branch = Blockly.Nelua.addLoopTrap(branch, block);
  branch = Blockly.Nelua.addContinueLabel_(branch);
  var loopVar = Blockly.Nelua.nameDB_.getDistinctName(
      'count', Blockly.VARIABLE_CATEGORY_NAME);
  var code = 'for ' + loopVar + ' = 0, ' + (repeats - 1) + ' do\n' +
      branch + 'end\n';
  return code;
};

Blockly.Nelua['controls_repeat'] = Blockly.Nelua['controls_repeat_ext'];

Blockly.Nelua['controls_whileUntil'] = function(block) {
  // Do while/until loop.
  var until = block.getFieldValue('MODE') == 'UNTIL';
  var argument0 = Blockly.Nelua.valueToCode(block, 'BOOL',
      until ? Blockly.Nelua.ORDER_UNARY :
      Blockly.Nelua.ORDER_NONE) || 'false';
  var branch = Blockly.Nelua.statementToCode(block, 'DO');
  branch = Blockly.Nelua.addLoopTrap(branch, block);
  branch = Blockly.Nelua.addContinueLabel_(branch);
  if (until) {
    argument0 = 'not ' + argument0;
  }
  return 'while ' + argument0 + ' do\n' + branch + 'end\n';
};

Blockly.Nelua['controls_for'] = function(block) {
  // For loop.
  var variable0 = Blockly.Nelua.nameDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var startVar = Blockly.Nelua.valueToCode(block, 'FROM',
      Blockly.Nelua.ORDER_NONE) || '0';
  var endVar = Blockly.Nelua.valueToCode(block, 'TO',
      Blockly.Nelua.ORDER_NONE) || '0';
  var increment = Blockly.Nelua.valueToCode(block, 'BY',
      Blockly.Nelua.ORDER_NONE) || '1';
  var branch = Blockly.Nelua.statementToCode(block, 'DO');
  branch = Blockly.Nelua.addLoopTrap(branch, block);
  branch = Blockly.Nelua.addContinueLabel_(branch);
  var code = '';
  var incValue;
  if (Blockly.isNumber(startVar) && Blockly.isNumber(endVar) &&
      Blockly.isNumber(increment)) {
    // All arguments are simple numbers.
    var up = Number(startVar) <= Number(endVar);
    var step = Math.abs(Number(increment));
    incValue = (up ? '' : '-') + step;
  } else {
    code = '';
    // Determine loop direction at start, in case one of the bounds
    // changes during loop execution.
    incValue = Blockly.Nelua.nameDB_.getDistinctName(
        variable0 + '_inc', Blockly.VARIABLE_CATEGORY_NAME);
    code += incValue + ' = ';
    if (Blockly.isNumber(increment)) {
      code += Math.abs(increment) + '\n';
    } else {
      code += 'math.abs(' + increment + ')\n';
    }
    code += 'if (' + startVar + ') > (' + endVar + ') then\n';
    code += Blockly.Nelua.INDENT + incValue + ' = -' + incValue + '\n';
    code += 'end\n';
  }
  code += 'for ' + variable0 + ' = ' + startVar + ', ' + endVar +
      ', ' + incValue;
  code += ' do\n' + branch + 'end\n';
  return code;
};

Blockly.Nelua['controls_forEach'] = function(block) {
  // For each loop.
  var variable0 = Blockly.Nelua.nameDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var argument0 = Blockly.Nelua.valueToCode(block, 'LIST',
      Blockly.Nelua.ORDER_NONE) || '#[[{}]]';
  var branch = Blockly.Nelua.statementToCode(block, 'DO');
  branch = Blockly.Nelua.addLoopTrap(branch, block);
  branch = Blockly.Nelua.addContinueLabel_(branch);
  var code = 'for _, ' + variable0 + ' in ipairs(' + argument0 + ') do \n' +
      branch + 'end\n';
  return code;
};

Blockly.Nelua['controls_flow_statements'] = function(block) {
  // Flow statements: continue, break.
  var xfix = '';
  if (Blockly.Nelua.STATEMENT_PREFIX) {
    // Automatic prefix insertion is switched off for this block.  Add manually.
    xfix += Blockly.Nelua.injectId(Blockly.Nelua.STATEMENT_PREFIX, block);
  }
  if (Blockly.Nelua.STATEMENT_SUFFIX) {
    // Inject any statement suffix here since the regular one at the end
    // will not get executed if the break/continue is triggered.
    xfix += Blockly.Nelua.injectId(Blockly.Nelua.STATEMENT_SUFFIX, block);
  }
  if (Blockly.Nelua.STATEMENT_PREFIX) {
    var loop = Blockly.Constants.Loops
        .CONTROL_FLOW_IN_LOOP_CHECK_MIXIN.getSurroundLoop(block);
    if (loop && !loop.suppressPrefixSuffix) {
      // Inject loop's statement prefix here since the regular one at the end
      // of the loop will not get executed if 'continue' is triggered.
      // In the case of 'break', a prefix is needed due to the loop's suffix.
      xfix += Blockly.Nelua.injectId(Blockly.Nelua.STATEMENT_PREFIX, loop);
    }
  }
  switch (block.getFieldValue('FLOW')) {
    case 'BREAK':
      return xfix + 'break\n';
    case 'CONTINUE':
      return xfix + Blockly.Nelua.CONTINUE_STATEMENT;
  }
  throw Error('Unknown flow statement.');
};
