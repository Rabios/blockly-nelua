/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Nelua for text blocks.
 * @author rodrigoq@google.com (Rodrigo Queiro)
 */
'use strict';

goog.provide('Blockly.Nelua.texts');

goog.require('Blockly.Nelua');


Blockly.Nelua['text'] = function(block) {
  // Text value.
  var code = Blockly.Nelua.quote_(block.getFieldValue('TEXT'));
  return [code, Blockly.Nelua.ORDER_ATOMIC];
};

Blockly.Nelua['text_multiline'] = function(block) {
  // Text value.
  var code = Blockly.Nelua.multiline_quote_(block.getFieldValue('TEXT'));
  var order = code.indexOf('..') != -1 ? Blockly.Nelua.ORDER_CONCATENATION :
      Blockly.Nelua.ORDER_ATOMIC;
  return [code, order];
};

Blockly.Nelua['text_join'] = function(block) {
  // Create a string made up of any number of elements of any type.
  if (block.itemCount_ == 0) {
    return ['\'\'', Blockly.Nelua.ORDER_ATOMIC];
  } else if (block.itemCount_ == 1) {
    var element = Blockly.Nelua.valueToCode(block, 'ADD0',
        Blockly.Nelua.ORDER_NONE) || '\'\'';
    var code = 'tostring(' + element + ')';
    return [code, Blockly.Nelua.ORDER_HIGH];
  } else if (block.itemCount_ == 2) {
    var element0 = Blockly.Nelua.valueToCode(block, 'ADD0',
        Blockly.Nelua.ORDER_CONCATENATION) || '\'\'';
    var element1 = Blockly.Nelua.valueToCode(block, 'ADD1',
        Blockly.Nelua.ORDER_CONCATENATION) || '\'\'';
    var code = element0 + ' .. ' + element1;
    return [code, Blockly.Nelua.ORDER_CONCATENATION];
  } else {
    var elements = [];
    for (var i = 0; i < block.itemCount_; i++) {
      elements[i] = Blockly.Nelua.valueToCode(block, 'ADD' + i,
          Blockly.Nelua.ORDER_NONE) || '\'\'';
    }
    var code = '##[[table.concat({' + elements.join(', ') + '})]]';
    return [code, Blockly.Nelua.ORDER_HIGH];
  }
};

Blockly.Nelua['text_append'] = function(block) {
  // Append to a variable in place.
  var varName = Blockly.Nelua.nameDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var value = Blockly.Nelua.valueToCode(block, 'TEXT',
      Blockly.Nelua.ORDER_CONCATENATION) || '\'\'';
  return varName + ' = ' + varName + ' .. ' + value + '\n';
};

Blockly.Nelua['text_length'] = function(block) {
  // String or array length.
  var text = Blockly.Nelua.valueToCode(block, 'VALUE',
      Blockly.Nelua.ORDER_UNARY) || '\'\'';
  return ['#' + text, Blockly.Nelua.ORDER_UNARY];
};

Blockly.Nelua['text_isEmpty'] = function(block) {
  // Is the string null or array empty?
  var text = Blockly.Nelua.valueToCode(block, 'VALUE',
      Blockly.Nelua.ORDER_UNARY) || '\'\'';
  return ['#' + text + ' == 0', Blockly.Nelua.ORDER_RELATIONAL];
};

Blockly.Nelua['text_indexOf'] = function(block) {
  // Search the text for a substring.
  var substring = Blockly.Nelua.valueToCode(block, 'FIND',
      Blockly.Nelua.ORDER_NONE) || '\'\'';
  var text = Blockly.Nelua.valueToCode(block, 'VALUE',
      Blockly.Nelua.ORDER_NONE) || '\'\'';
  if (block.getFieldValue('END') == 'FIRST') {
    var functionName = Blockly.Nelua.provideFunction_(
        'firstIndexOf',
        ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ +
             '(str: string, substr: string): uinteger',
         '  local i: uinteger = string.find(str, substr, 1, true)',
         '  if i == nil then',
         '    return 0',
         '  else',
         '    return i',
         '  end',
         'end']);
  } else {
    var functionName = Blockly.Nelua.provideFunction_(
        'lastIndexOf',
        ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ +
             '(str: string, substr: string): uinteger',
         '  local i: uinteger = string.find(string.reverse(str), ' +
             'string.reverse(substr), 1, true)',
         '  if i then',
         '    return #str + 2 - i - #substr',
         '  end',
         '  return 0',
         'end']);
  }
  var code = functionName + '(' + text + ', ' + substring + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['text_charAt'] = function(block) {
  // Get letter at index.
  // Note: Until January 2013 this block did not have the WHERE input.
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var atOrder = (where == 'FROM_END') ? Blockly.Nelua.ORDER_UNARY :
      Blockly.Nelua.ORDER_NONE;
  var at = Blockly.Nelua.valueToCode(block, 'AT', atOrder) || '1';
  var text = Blockly.Nelua.valueToCode(block, 'VALUE',
      Blockly.Nelua.ORDER_NONE) || '\'\'';
  var code;
  if (where == 'RANDOM') {
    var functionName = Blockly.Nelua.provideFunction_(
        'text_random_letter',
        ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(str: string): string',
         '  local index: uinteger = math.random(string.len(str))',
         '  return string.sub(str, index, index)',
         'end']);
    code = functionName + '(' + text + ')';
  } else {
    if (where == 'FIRST') {
      var start = '1';
    } else if (where == 'LAST') {
      var start = '-1';
    } else {
      if (where == 'FROM_START') {
        var start = at;
      } else if (where == 'FROM_END') {
        var start = '-' + at;
      } else {
        throw Error('Unhandled option (text_charAt).');
      }
    }
    if (start.match(/^-?\w*$/)) {
      code = 'string.sub(' + text + ', ' + start + ', ' + start + ')';
    } else {
      // use function to avoid reevaluation
      var functionName = Blockly.Nelua.provideFunction_(
          'text_char_at',
          ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ +
               '(str: string, index: uinteger): string',
           '  return string.sub(str, index, index)',
           'end']);
      code = functionName + '(' + text + ', ' + start + ')';
    }
  }
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['text_getSubstring'] = function(block) {
  // Get substring.
  var text = Blockly.Nelua.valueToCode(block, 'STRING',
      Blockly.Nelua.ORDER_NONE) || '\'\'';

  // Get start index.
  var where1 = block.getFieldValue('WHERE1');
  var at1Order = (where1 == 'FROM_END') ? Blockly.Nelua.ORDER_UNARY :
      Blockly.Nelua.ORDER_NONE;
  var at1 = Blockly.Nelua.valueToCode(block, 'AT1', at1Order) || '0';
  if (where1 == 'FIRST') {
    var start = 0;
  } else if (where1 == 'FROM_START') {
    var start = at1;
  } else if (where1 == 'FROM_END') {
    var start = '-' + at1;
  } else {
    throw Error('Unhandled option (text_getSubstring)');
  }

  // Get end index.
  var where2 = block.getFieldValue('WHERE2');
  var at2Order = (where2 == 'FROM_END') ? Blockly.Nelua.ORDER_UNARY :
      Blockly.Nelua.ORDER_NONE;
  var at2 = Blockly.Nelua.valueToCode(block, 'AT2', at2Order) || '1';
  if (where2 == 'LAST') {
    var end = -1;
  } else if (where2 == 'FROM_START') {
    var end = at2;
  } else if (where2 == 'FROM_END') {
    var end = '-' + at2;
  } else {
    throw Error('Unhandled option (text_getSubstring)');
  }
  var code = 'string.sub(' + text + ', ' + start + ', ' + end + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['text_changeCase'] = function(block) {
  // Change capitalization.
  var operator = block.getFieldValue('CASE');
  var text = Blockly.Nelua.valueToCode(block, 'TEXT',
      Blockly.Nelua.ORDER_NONE) || '\'\'';
  if (operator == 'UPPERCASE') {
    var functionName = 'string.upper';
  } else if (operator == 'LOWERCASE') {
    var functionName = 'string.lower';
  } else if (operator == 'TITLECASE') {
    var functionName = Blockly.Nelua.provideFunction_(
        'text_titlecase',
        // There are shorter versions at
        // http://lua-users.org/wiki/SciteTitleCase
        // that do not preserve whitespace.
        ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(str: string): string',
         '  local buf: vector(string) = {}',
         '  local inWord: boolean = false',
         '  local res: string = \"\"',
         '  for i = 0, #str do',
         '    local c: string = string.sub(str, i, i)',
         '    if inWord then',
         '      buf[#buf + 1] = string.lower(c)',
         '      if string.find(c, "%s") then',
         '        inWord = false',
         '      end',
         '    else',
         '      buf[#buf + 1] = string.upper(c)',
         '      inWord = true',
         '    end',
         '  end',
         '  for i = 0, #buf - 1 do',
         '    res = res .. buf[i]',
         '  end',
         '  return res',
         'end']);
  }
  var code = functionName + '(' + text + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['text_trim'] = function(block) {
  // Trim spaces.
  var OPERATORS = {
    LEFT: '^%s*(,-)',
    RIGHT: '(.-)%s*$',
    BOTH: '^%s*(.-)%s*$'
  };
  var operator = OPERATORS[block.getFieldValue('MODE')];
  var text = Blockly.Nelua.valueToCode(block, 'TEXT',
      Blockly.Nelua.ORDER_NONE) || '\'\'';
  var code = 'string.gsub(' + text + ', "' + operator + '", "%1")';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['text_print'] = function(block) {
  // Print statement.
  var msg = Blockly.Nelua.valueToCode(block, 'TEXT',
      Blockly.Nelua.ORDER_NONE) || '\'\'';
  return 'print(' + msg + ')\n';
};

Blockly.Nelua['text_prompt_ext'] = function(block) {
  // Prompt function.
  if (block.getField('TEXT')) {
    // Internal message.
    var msg = Blockly.Nelua.quote_(block.getFieldValue('TEXT'));
  } else {
    // External message.
    var msg = Blockly.Nelua.valueToCode(block, 'TEXT',
        Blockly.Nelua.ORDER_NONE) || '\'\'';
  }

  var functionName = Blockly.Nelua.provideFunction_(
      'text_prompt',
      ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(msg: string): string',
       '  io.write(msg)',
       '  io.flush()',
       '  return io.read()',
       'end']);
  var code = functionName + '(' + msg + ')';

  var toNumber = block.getFieldValue('TYPE') == 'NUMBER';
  if (toNumber) {
    code = 'tonumber(' + code + ', 10)';
  }
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['text_prompt'] = Blockly.Nelua['text_prompt_ext'];

Blockly.Nelua['text_count'] = function(block) {
  var text = Blockly.Nelua.valueToCode(block, 'TEXT',
      Blockly.Nelua.ORDER_NONE) || '\'\'';
  var sub = Blockly.Nelua.valueToCode(block, 'SUB',
      Blockly.Nelua.ORDER_NONE) || '\'\'';
  var functionName = Blockly.Nelua.provideFunction_(
      'text_count',
      ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_
        + '(haystack: auto, needle: auto): uinteger',
        '  ## assert(haystack.type.is_vector)',
        '  ## assert(needle.type.is_vector)',
        '  if #needle == 0 then',
        '    return #haystack',
        '  end',
        '  local i: uinteger = 0',
        '  local count: uinteger = 0',
        '  while true do',
        '    i = string.find(haystack, needle, i, true)',
        '    if i == nil then',
        '      break',
        '    end',
        '    count = count + 1',
        '    i = i + #needle',
        '  end',
        '  return count',
        'end',
      ]);
  var code = functionName + '(' + text + ', ' + sub + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['text_replace'] = function(block) {
  var text = Blockly.Nelua.valueToCode(block, 'TEXT',
      Blockly.Nelua.ORDER_NONE) || '\'\'';
  var from = Blockly.Nelua.valueToCode(block, 'FROM',
      Blockly.Nelua.ORDER_NONE) || '\'\'';
  var to = Blockly.Nelua.valueToCode(block, 'TO',
      Blockly.Nelua.ORDER_NONE) || '\'\'';
  var functionName = Blockly.Nelua.provideFunction_(
      'text_replace',
      ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_
        + '(haystack: auto, needle: auto, replacement: string): string',
        '  ## assert(haystack.type.is_vector)',
        '  ## assert(needle.type.is_vector)',
        '  local buf: vector(string) = {}',
        '  local i: uinteger = 0',
        '  local res: string = \"\"',
        '  while i <= #haystack do',
        '    if string.sub(haystack, i, #needle - 1) == needle then',
        '      for j = 0, #replacement do',
        '        buf[#buf + 1] = string.sub(replacement, j, j))',
        '      end',
        '      i = i + #needle',
        '    else',
        '      buf[#buf + 1] = string.sub(haystack, i, i))',
        '      i = i + 1',
        '    end',
        '  end',
        '  for i = 0, #buf - 1 do',
        '    res = res .. buf[i]',
        '  end',
        '  return res',
        'end',
      ]);
  var code = functionName + '(' + text + ', ' + from + ', ' + to + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['text_reverse'] = function(block) {
  var text = Blockly.Nelua.valueToCode(block, 'TEXT',
      Blockly.Nelua.ORDER_NONE) || '\'\'';
  var code = 'string.reverse(' + text + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};
