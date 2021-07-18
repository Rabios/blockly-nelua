/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Nelua for list blocks.
 * @author rodrigoq@google.com (Rodrigo Queiro)
 */
'use strict';

goog.provide('Blockly.Nelua.lists');

goog.require('Blockly.Nelua');

Blockly.Nelua.lists = {};

Blockly.Nelua['lists_create_empty'] = function(block) {
  // Create an empty list.
  return ['##[[{}]]', Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['lists_create_with'] = function(block) {
  // Create a list with any number of elements of any type.
  var elements = new Array(block.itemCount_);
  for (var i = 0; i < block.itemCount_; i++) {
    elements[i] = Blockly.Nelua.valueToCode(block, 'ADD' + i,
        Blockly.Nelua.ORDER_NONE) || 'None';
  }
  var code = '##[[{' + elements.join(', ') + '}]]';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['lists_repeat'] = function(block) {
  // Create a list with one element repeated.
  var functionName = Blockly.Nelua.provideFunction_(
      'create_list_repeated',
      ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(item: auto, count: uinteger): #[item.type]',
       '  ## assert(item.type.is_vector)',
       '  local t: #[item.type] = {}',
       '  for i = 0, count - 1 do',
       '    t[i] = item',
       '  end',
       '  return t',
       'end']);
  var element = Blockly.Nelua.valueToCode(block, 'ITEM',
      Blockly.Nelua.ORDER_NONE) || 'None';
  var repeatCount = Blockly.Nelua.valueToCode(block, 'NUM',
      Blockly.Nelua.ORDER_NONE) || '0';
  var code = functionName + '(' + element + ', ' + repeatCount + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['lists_length'] = function(block) {
  // String or array length.
  var list = Blockly.Nelua.valueToCode(block, 'VALUE',
      Blockly.Nelua.ORDER_UNARY) || '#[[{}]]';
  return ['#' + list, Blockly.Nelua.ORDER_UNARY];
};

Blockly.Nelua['lists_isEmpty'] = function(block) {
  // Is the string null or array empty?
  var list = Blockly.Nelua.valueToCode(block, 'VALUE',
      Blockly.Nelua.ORDER_UNARY) || '#[[{}]]';
  var code = '#' + list + ' == 0';
  return [code, Blockly.Nelua.ORDER_RELATIONAL];
};

Blockly.Nelua['lists_indexOf'] = function(block) {
  // Find an item in the list.
  var item = Blockly.Nelua.valueToCode(block, 'FIND',
      Blockly.Nelua.ORDER_NONE) || '\'\'';
  var list = Blockly.Nelua.valueToCode(block, 'VALUE',
      Blockly.Nelua.ORDER_NONE) || '#[[{}]]';
  if (block.getFieldValue('END') == 'FIRST') {
    var functionName = Blockly.Nelua.provideFunction_(
        'first_index',
        ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(t: auto, elem): uinteger',
         '  ## assert(t.type.is_vector)',
         '  for k, v in ipairs(t) do',
         '    if v == elem then',
         '      return k',
         '    end',
         '  end',
         '  return 0',
         'end']);
  } else {
    var functionName = Blockly.Nelua.provideFunction_(
        'last_index',
        ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(t: auto, elem: auto): uinteger',
         '  ## assert(t.type.is_vector)',
         '  for i = #t - 1, 0, -1 do',
         '    if t[i] == elem then',
         '      return i',
         '    end',
         '  end',
         '  return 0',
         'end']);
  }
  var code = functionName + '(' + list + ', ' + item + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

/**
 * Returns an expression calculating the index into a list.
 * @param {string} listName Name of the list, used to calculate length.
 * @param {string} where The method of indexing, selected by dropdown in Blockly
 * @param {string=} opt_at The optional offset when indexing from start/end.
 * @return {string|undefined} Index expression.
 * @private
 */
Blockly.Nelua.lists.getIndex_ = function(listName, where, opt_at) {
  if (where == 'FIRST') {
    return '0';
  } else if (where == 'FROM_END') {
    return ('#' + listName + ' - ' + opt_at) + " - 1";
  } else if (where == 'LAST') {
    return '#' + listName;
  } else if (where == 'RANDOM') {
    return 'math.random(#' + listName + ')';
  } else {
    return opt_at;
  }
};

Blockly.Nelua['lists_getIndex'] = function(block) {
  // Get element at index.
  // Note: Until January 2013 this block did not have MODE or WHERE inputs.
  var mode = block.getFieldValue('MODE') || 'GET';
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var list = Blockly.Nelua.valueToCode(block, 'VALUE', Blockly.Nelua.ORDER_HIGH) ||
      '(##[[{}]])';
  var getIndex_ = Blockly.Nelua.lists.getIndex_;

  // If `list` would be evaluated more than once (which is the case for LAST,
  // FROM_END, and RANDOM) and is non-trivial, make sure to access it only once.
  if ((where == 'LAST' || where == 'FROM_END' || where == 'RANDOM') &&
      !list.match(/^\w+$/)) {
    // `list` is an expression, so we may not evaluate it more than once.
    if (mode == 'REMOVE') {
      // We can use multiple statements.
      var atOrder = (where == 'FROM_END') ? Blockly.Nelua.ORDER_ADDITIVE :
          Blockly.Nelua.ORDER_NONE;
      var at = Blockly.Nelua.valueToCode(block, 'AT', atOrder) || '1';
      var listVar = Blockly.Nelua.nameDB_.getDistinctName(
          'tmp_list', Blockly.VARIABLE_CATEGORY_NAME);
      at = getIndex_(listVar, where, at);
      var code = listVar + ' = ' + list + '\n' +
          listVar + '[' + at + '] = nil\n';
      return code;
    } else {
      // We need to create a procedure to avoid reevaluating values.
      var at = Blockly.Nelua.valueToCode(block, 'AT', Blockly.Nelua.ORDER_NONE) ||
          '0';
      if (mode == 'GET') {
        var functionName = Blockly.Nelua.provideFunction_(
            'list_get_' + where.toLowerCase(),
            ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(t: auto' +
                // The value for 'FROM_END' and'FROM_START' depends on `at` so
                // we add it as a parameter.
                ((where == 'FROM_END' || where == 'FROM_START') ?
                    ', at: uinteger)' : ')'),
             '  return t[' + getIndex_('t', where, 'at') + ']',
             'end']);
      } else {  //  mode == 'GET_REMOVE'
        var functionName = Blockly.Nelua.provideFunction_(
            'list_remove_' + where.toLowerCase(),
            ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(t: auto' +
                // The value for 'FROM_END' and'FROM_START' depends on `at` so
                // we add it as a parameter.
                ((where == 'FROM_END' || where == 'FROM_START') ?
                    ', at: uinteger)' : ')'),
             '  return t[ ' + getIndex_('t', where, 'at') + '] = nil',
             'end']);
      }
      var code = functionName + '(' + list +
          // The value for 'FROM_END' and 'FROM_START' depends on `at` so we
          // pass it.
          ((where == 'FROM_END' || where == 'FROM_START') ? ', ' + at : '') +
          ')';
      return [code, Blockly.Nelua.ORDER_HIGH];
    }
  } else {
    // Either `list` is a simple variable, or we only need to refer to `list`
    // once.
    var atOrder = (mode == 'GET' && where == 'FROM_END') ?
        Blockly.Nelua.ORDER_ADDITIVE : Blockly.Nelua.ORDER_NONE;
    var at = Blockly.Nelua.valueToCode(block, 'AT', atOrder) || '1';
    at = getIndex_(list, where, at);
    if (mode == 'GET') {
      var code = list + '[' + at + ']';
      return [code, Blockly.Nelua.ORDER_HIGH];
    } else {
      //var code = 'table.remove(' + list + ', ' + at + ')';
      var code = list + ' = nil'
      if (mode == 'GET_REMOVE') {
        return [code, Blockly.Nelua.ORDER_HIGH];
      } else {  // `mode` == 'REMOVE'
        return code + '\n';
      }
    }
  }
};

Blockly.Nelua['lists_setIndex'] = function(block) {
  // Set element at index.
  // Note: Until February 2013 this block did not have MODE or WHERE inputs.
  var list = Blockly.Nelua.valueToCode(block, 'LIST',
      Blockly.Nelua.ORDER_HIGH) || '#[[{}]]';
  var mode = block.getFieldValue('MODE') || 'SET';
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var at = Blockly.Nelua.valueToCode(block, 'AT',
      Blockly.Nelua.ORDER_ADDITIVE) || '0';
  var value = Blockly.Nelua.valueToCode(block, 'TO',
      Blockly.Nelua.ORDER_NONE) || 'None';
  var getIndex_ = Blockly.Nelua.lists.getIndex_;

  var code = '';
  // If `list` would be evaluated more than once (which is the case for LAST,
  // FROM_END, and RANDOM) and is non-trivial, make sure to access it only once.
  if ((where == 'LAST' || where == 'FROM_END' || where == 'RANDOM') &&
      !list.match(/^\w+$/)) {
    // `list` is an expression, so we may not evaluate it more than once.
    // We can use multiple statements.
    var listVar = Blockly.Nelua.nameDB_.getDistinctName(
        'tmp_list', Blockly.VARIABLE_CATEGORY_NAME);
    code = listVar + ' = ' + list + '\n';
    list = listVar;
  }
  if (mode == 'SET') {
    code += list + '[' + getIndex_(list, where, at) + '] = ' + value;
  } else {  // `mode` == 'INSERT'
    // LAST is a special case, because we want to insert
    // *after* not *before*, the existing last element.
    code += list + '[#' + list + ' + 1' +
        (getIndex_(list, where, at) + (where == 'LAST' ? ' + 1' : '')) +
        '] = ' + value;
  }
  return code + '\n';
};

Blockly.Nelua['lists_getSublist'] = function(block) {
  // Get sublist.
  var list = Blockly.Nelua.valueToCode(block, 'LIST',
      Blockly.Nelua.ORDER_NONE) || 'vector(any)';
  var where1 = block.getFieldValue('WHERE1');
  var where2 = block.getFieldValue('WHERE2');
  var at1 = Blockly.Nelua.valueToCode(block, 'AT1',
      Blockly.Nelua.ORDER_NONE) || '0';
  var at2 = Blockly.Nelua.valueToCode(block, 'AT2',
      Blockly.Nelua.ORDER_NONE) || '0';
  var getIndex_ = Blockly.Nelua.lists.getIndex_;

  var functionName = Blockly.Nelua.provideFunction_(
      'list_sublist_' + where1.toLowerCase() + '_' + where2.toLowerCase(),
      ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(source: auto' +
          // The value for 'FROM_END' and'FROM_START' depends on `at` so
          // we add it as a parameter.
          ((where1 == 'FROM_END' || where1 == 'FROM_START') ? ', at1: uinteger' : '') +
          ((where2 == 'FROM_END' || where2 == 'FROM_START') ? ', at2: uinteger' : '') +
          '): #[source.type]',
       '  ## assert(source.type.is_vector)',
       '  local t: #[source.type] = {}',
       '  local start: uinteger = ' + getIndex_('source', where1, 'at1'),
       '  local finish: uinteger = ' + getIndex_('source', where2, 'at2'),
       '  for i = start - 1, finish - 1 do',
       '    t[i] = source[i]',
       '  end',
       '  return t',
       'end']);
  var code = functionName + '(' + list +
      // The value for 'FROM_END' and 'FROM_START' depends on `at` so we
      // pass it.
      ((where1 == 'FROM_END' || where1 == 'FROM_START') ? ', ' + at1 : '') +
      ((where2 == 'FROM_END' || where2 == 'FROM_START') ? ', ' + at2 : '') +
      ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['lists_sort'] = function(block) {
  // Block for sorting a list.
  var list = Blockly.Nelua.valueToCode(
      block, 'LIST', Blockly.Nelua.ORDER_NONE) || 'vector(any)';
  var direction = block.getFieldValue('DIRECTION') === '0' ? 1 : -1;
  var type = block.getFieldValue('TYPE');

  var functionName = Blockly.Nelua.provideFunction_(
      'list_sort',
      ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ +
          '(list: auto, typev: auto, direction: uinteger)',
       '  ## assert(list.type.is_vector)',
       '  local function partition(array: auto, left: uinteger, right: uinteger, pivotIndex: uinteger): number',
       '    ## assert(array.type.is_vector)',
       '    local pivotValue = array[pivotIndex]',
       '    array[pivotIndex], array[right] = array[right], array[pivotIndex]',
       '    local storeIndex: uinteger = left',
       '    for i = left - 1, right - 1 do',
       '      if array[i] <= pivotValue then',
	   '        array[i], array[storeIndex] = array[storeIndex], array[i]',
	   '        storeIndex = storeIndex + 1',
	   '      end',
	   '      array[storeIndex], array[right] = array[right], array[storeIndex]',
	   '    end',
       '    return storeIndex',
       '  end',
       '  local function quicksort(array: auto, left: uinteger, right: uinteger)',
       '    ## assert(array.type.is_vector)',
       '    if right > left then',
       '      quicksort(array, left, pivotNewIndex - 1)',
	   '      quicksort(array, pivotNewIndex, right)',
       '    end',
       '  end',
       '  local t: #[list.type] = {}',
       '  local i: uinteger = 0',
       '  for n, v in pairs(list) do',
       '    t[i] = v',
       '    i = i + 1',
       '  end', // Shallow-copy.
       '  ##[[local compareFuncs = {',
       '    NUMERIC = function(a, b)',
       '      return (tonumber(tostring(a)) or 0)',
       '          < (tonumber(tostring(b)) or 0) end,',
       '    TEXT = function(a, b)',
       '      return tostring(a) < tostring(b) end,',
       '    IGNORE_CASE = function(a, b)',
       '      return string.lower(tostring(a)) < string.lower(tostring(b)) end',
       '  }]]',
       '  local compareTemp = #[[compareFuncs[typev]]]',
       '  local compare = compareTemp',
       '  if direction == -1',
       '  then compare = function(a, b) return compareTemp(b, a) end',
       '  end',
       '  quicksort(t, ##[[compare]])',
       '  return t',
       'end']);

  var code = functionName +
      '(' + list + ',"' + type + '", ' + direction + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['lists_split'] = function(block) {
  // Block for splitting text into a list, or joining a list into text.
  var input = Blockly.Nelua.valueToCode(block, 'INPUT',
      Blockly.Nelua.ORDER_NONE);
  var delimiter = Blockly.Nelua.valueToCode(block, 'DELIM',
      Blockly.Nelua.ORDER_NONE) || '\'\'';
  var mode = block.getFieldValue('MODE');
  var functionName;
  if (mode == 'SPLIT') {
    if (!input) {
      input = '\'\'';
    }
    functionName = Blockly.Nelua.provideFunction_(
        'list_string_split',
        ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ +
            '(input: string, delim: string): #[t.type]',
         '  local t: #[t.type] = {}',
         '  local pos: uinteger = 0',
         '  while true do',
         '    next_delim = string.find(input, delim, pos)',
         '    if next_delim == nil then',
         '      t[#t + 1] = string.sub(input, pos))',
         '      break',
         '    else',
         '      t[#t + 1] = string.sub(input, pos, next_delim-1))',
         '      pos = next_delim + #delim',
         '    end',
         '  end',
         '  return t',
         'end']);
  } else if (mode == 'JOIN') {
    if (!input) {
      input = '##[[{}]]';
    }
    functionName = 'table.concat';
  } else {
    throw Error('Unknown mode: ' + mode);
  }
  var code = "##[[" +functionName + '(' + input + ', ' + delimiter + ')]]';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['lists_reverse'] = function(block) {
  // Block for reversing a list.
  var list = Blockly.Nelua.valueToCode(block, 'LIST',
      Blockly.Nelua.ORDER_NONE) || '##[[{}]]';
  var functionName = Blockly.Nelua.provideFunction_(
      'list_reverse',
      ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(input: auto): #[input.type]',
       '  ## assert(input.type.is_vector)',
       '  local reversed: #[input.type] = {}',
       '  local count: uinteger = 0',
       '  for i = #input - 1, 0, -1 do',
       '    reversed[count] = input[i]',
       '    count = count + 1',
       '  end',
       '  return reversed',
       'end']);
  var code = functionName + '(' + list + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};
