/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Nelua for math blocks.
 * @author rodrigoq@google.com (Rodrigo Queiro)
 */
'use strict';

goog.provide('Blockly.Nelua.math');

goog.require('Blockly.Nelua');


Blockly.Nelua['math_number'] = function(block) {
  // Numeric value.
  var code = Number(block.getFieldValue('NUM'));
  var order = code < 0 ? Blockly.Nelua.ORDER_UNARY :
              Blockly.Nelua.ORDER_ATOMIC;
  return [code, order];
};

Blockly.Nelua['math_arithmetic'] = function(block) {
  // Basic arithmetic operators, and power.
  var OPERATORS = {
    ADD: [' + ', Blockly.Nelua.ORDER_ADDITIVE],
    MINUS: [' - ', Blockly.Nelua.ORDER_ADDITIVE],
    MULTIPLY: [' * ', Blockly.Nelua.ORDER_MULTIPLICATIVE],
    DIVIDE: [' / ', Blockly.Nelua.ORDER_MULTIPLICATIVE],
    POWER: [' ^ ', Blockly.Nelua.ORDER_EXPONENTIATION]
  };
  var tuple = OPERATORS[block.getFieldValue('OP')];
  var operator = tuple[0];
  var order = tuple[1];
  var argument0 = Blockly.Nelua.valueToCode(block, 'A', order) || '0';
  var argument1 = Blockly.Nelua.valueToCode(block, 'B', order) || '0';
  var code = argument0 + operator + argument1;
  return [code, order];
};

Blockly.Nelua['math_single'] = function(block) {
  // Math operators with single operand.
  var operator = block.getFieldValue('OP');
  var code;
  var arg;
  if (operator == 'NEG') {
    // Negation is a special case given its different operator precedence.
    arg = Blockly.Nelua.valueToCode(block, 'NUM',
        Blockly.Nelua.ORDER_UNARY) || '0';
    return ['-' + arg, Blockly.Nelua.ORDER_UNARY];
  }
  if (operator == 'POW10') {
    arg = Blockly.Nelua.valueToCode(block, 'NUM',
        Blockly.Nelua.ORDER_EXPONENTIATION) || '0';
    return ['10 ^ ' + arg, Blockly.Nelua.ORDER_EXPONENTIATION];
  }
  if (operator == 'ROUND') {
    arg = Blockly.Nelua.valueToCode(block, 'NUM',
        Blockly.Nelua.ORDER_ADDITIVE) || '0';
  } else {
    arg = Blockly.Nelua.valueToCode(block, 'NUM',
        Blockly.Nelua.ORDER_NONE) || '0';
  }
  switch (operator) {
    case 'ABS':
      code = 'math.abs(' + arg + ')';
      break;
    case 'ROOT':
      code = 'math.sqrt(' + arg + ')';
      break;
    case 'LN':
      code = 'math.log(' + arg + ')';
      break;
    case 'LOG10':
      code = 'math.log(' + arg + ', 10)';
      break;
    case 'EXP':
      code = 'math.exp(' + arg + ')';
      break;
    case 'ROUND':
      // This rounds up.  Blockly does not specify rounding direction.
      code = 'math.floor(' + arg + ' + .5)';
      break;
    case 'ROUNDUP':
      code = 'math.ceil(' + arg + ')';
      break;
    case 'ROUNDDOWN':
      code = 'math.floor(' + arg + ')';
      break;
    case 'SIN':
      code = 'math.sin(math.rad(' + arg + '))';
      break;
    case 'COS':
      code = 'math.cos(math.rad(' + arg + '))';
      break;
    case 'TAN':
      code = 'math.tan(math.rad(' + arg + '))';
      break;
    case 'ASIN':
      code = 'math.deg(math.asin(' + arg + '))';
      break;
    case 'ACOS':
      code = 'math.deg(math.acos(' + arg + '))';
      break;
    case 'ATAN':
      code = 'math.deg(math.atan(' + arg + '))';
      break;
    default:
      throw Error('Unknown math operator: ' + operator);
  }
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['math_constant'] = function(block) {
  // Constants: PI, E, the Golden Ratio, sqrt(2), 1/sqrt(2), INFINITY.
  var CONSTANTS = {
    PI: ['math.pi', Blockly.Nelua.ORDER_HIGH],
    E: ['math.exp(1)', Blockly.Nelua.ORDER_HIGH],
    GOLDEN_RATIO: ['(1 + math.sqrt(5)) / 2', Blockly.Nelua.ORDER_MULTIPLICATIVE],
    SQRT2: ['math.sqrt(2)', Blockly.Nelua.ORDER_HIGH],
    SQRT1_2: ['math.sqrt(1 / 2)', Blockly.Nelua.ORDER_HIGH],
    INFINITY: ['math.huge', Blockly.Nelua.ORDER_HIGH]
  };
  return CONSTANTS[block.getFieldValue('CONSTANT')];
};

Blockly.Nelua['math_number_property'] = function(block) {
  // Check if a number is even, odd, prime, whole, positive, or negative
  // or if it is divisible by certain number. Returns true or false.
  var number_to_check = Blockly.Nelua.valueToCode(block, 'NUMBER_TO_CHECK',
      Blockly.Nelua.ORDER_MULTIPLICATIVE) || '0';
  var dropdown_property = block.getFieldValue('PROPERTY');
  var code;
  if (dropdown_property == 'PRIME') {
    // Prime is a special case as it is not a one-liner test.
    var functionName = Blockly.Nelua.provideFunction_(
        'math_isPrime',
        ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(n: number): number',
         '  -- https://en.wikipedia.org/wiki/Primality_test#Naive_methods',
         '  if n == 2 or n == 3 then',
         '    return true',
         '  end',
         '  -- False if n is NaN, negative, is 1, or not whole.',
         '  -- And false if n is divisible by 2 or 3.',
         '  if not(n > 1) or n % 1 ~= 0 or n % 2 == 0 or n % 3 == 0 then',
         '    return false',
         '  end',
         '  -- Check all the numbers of form 6k +/- 1, up to sqrt(n).',
         '  for x = 6, math.sqrt(n) + 1.5, 6 do',
         '    if n % (x - 1) == 0 or n % (x + 1) == 0 then',
         '      return false',
         '    end',
         '  end',
         '  return true',
         'end']);
    code = functionName + '(' + number_to_check + ')';
    return [code, Blockly.Nelua.ORDER_HIGH];
  }
  switch (dropdown_property) {
    case 'EVEN':
      code = number_to_check + ' % 2 == 0';
      break;
    case 'ODD':
      code = number_to_check + ' % 2 == 1';
      break;
    case 'WHOLE':
      code = number_to_check + ' % 1 == 0';
      break;
    case 'POSITIVE':
      code = number_to_check + ' > 0';
      break;
    case 'NEGATIVE':
      code = number_to_check + ' < 0';
      break;
    case 'DIVISIBLE_BY':
      var divisor = Blockly.Nelua.valueToCode(block, 'DIVISOR',
          Blockly.Nelua.ORDER_MULTIPLICATIVE);
      // If 'divisor' is some code that evals to 0, Nelua will produce a nan.
      // Let's produce nil if we can determine this at compile-time.
      if (!divisor || divisor == '0') {
        return ['nil', Blockly.Nelua.ORDER_ATOMIC];
      }
      // The normal trick to implement ?: with and/or doesn't work here:
      //   divisor == 0 and nil or number_to_check % divisor == 0
      // because nil is false, so allow a runtime failure. :-(
      code = number_to_check + ' % ' + divisor + ' == 0';
      break;
  }
  return [code, Blockly.Nelua.ORDER_RELATIONAL];
};

Blockly.Nelua['math_change'] = function(block) {
  // Add to a variable in place.
  var argument0 = Blockly.Nelua.valueToCode(block, 'DELTA',
      Blockly.Nelua.ORDER_ADDITIVE) || '0';
  var varName = Blockly.Nelua.nameDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  return varName + ' = ' + varName + ' + ' + argument0 + '\n';
};

// Rounding functions have a single operand.
Blockly.Nelua['math_round'] = Blockly.Nelua['math_single'];
// Trigonometry functions have a single operand.
Blockly.Nelua['math_trig'] = Blockly.Nelua['math_single'];

Blockly.Nelua['math_on_list'] = function(block) {
  // Math functions for lists.
  var func = block.getFieldValue('OP');
  var list = Blockly.Nelua.valueToCode(block, 'LIST',
      Blockly.Nelua.ORDER_NONE) || '##[[{}]]';
  var functionName;

  // Functions needed in more than one case.
  function provideSum() {
    return Blockly.Nelua.provideFunction_(
        'math_sum',
        ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(t: auto): number',
         '  assert(t.type.is_vector)',
         '  local result: number = 0',
         '  for _, v in ipairs(t) do',
         '    result = result + v',
         '  end',
         '  return result',
         'end']);
  }

  switch (func) {
    case 'SUM':
      functionName = provideSum();
      break;

    case 'MIN':
      // Returns 0 for the empty list.
      functionName = Blockly.Nelua.provideFunction_(
          'math_min',
          ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(t: auto): number',
           '  assert(t.type.is_vector)',
           '  if #t == 0 then',
           '    return 0',
           '  end',
           '  local result: number = math.huge',
           '  for _, v in ipairs(t) do',
           '    if v < result then',
           '      result = v',
           '    end',
           '  end',
           '  return result',
           'end']);
      break;

    case 'AVERAGE':
      // Returns 0 for the empty list.
      functionName = Blockly.Nelua.provideFunction_(
          'math_average',
          ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(t: auto): number',
           '  assert(t.type.is_vector)',
           '  if #t == 0 then',
           '    return 0',
           '  end',
           '  return ' + provideSum() + '(t) / #t',
           'end']);
      break;

    case 'MAX':
      // Returns 0 for the empty list.
      functionName = Blockly.Nelua.provideFunction_(
          'math_max',
          ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(t: auto): number',
           '  assert(t.type.is_vector)',
           '  if #t == 0 then',
           '    return 0',
           '  end',
           '  local result: number = -math.huge',
           '  for _, v in ipairs(t) do',
           '    if v > result then',
           '      result = v',
           '    end',
           '  end',
           '  return result',
           'end']);
      break;

    case 'MEDIAN':
      functionName = Blockly.Nelua.provideFunction_(
          'math_median',
          // This operation excludes non-numbers.
          ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(t: auto): number',
           '  local function partition(arr: auto, left: uinteger, right: uinteger, pivotIndex: uinteger): number',
           '    assert(arr.type.is_vector)',
           '    local pivotValue = arr[pivotIndex]',
           '    arr[pivotIndex], arr[right] = arr[right], arr[pivotIndex]',
           '    local storeIndex: uinteger = left',
           '    for i = left - 1, right - 1 do',
           '      if arr[i] <= pivotValue then',
	       '        arr[i], arr[storeIndex] = arr[storeIndex], arr[i]',
	       '        storeIndex = storeIndex + 1',
		   '      end',
		   '      arr[storeIndex], arr[right] = arr[right], arr[storeIndex]',
	       '    end',
           '    return storeIndex',
           '  end',
           '  local function quicksort(arr: auto, left: uinteger, right: uinteger)',
           '    assert(arr.type.is_vector)',
           '    if right > left then',
           '      quicksort(arr, left, pivotNewIndex - 1)',
	       '      quicksort(arr, pivotNewIndex, right)',
           '    end',
           '  end',
           '  assert(t.type.is_vector)',
           '  -- Source: http://lua-users.org/wiki/SimpleStats',
           '  if #t == 0 then',
           '    return 0',
           '  end',
           '  local temp: #[t.type] = {}',
           '  for _, v in ipairs(t) do',
           '    if type(v) == "number" then',
           '      temp[#temp + 1] = v',
           '    end',
           '  end',
           '  quicksort(temp, 1, #temp)',
           '  if #temp % 2 == 0 then',
           '    return (temp[#temp/2] + temp[(#temp/2)+1]) / 2',
           '  else',
           '    return temp[math.ceil(#temp/2)]',
           '  end',
           'end']);
      break;

    case 'MODE':
      functionName = Blockly.Nelua.provideFunction_(
          'math_modes',
          // As a list of numbers can contain more than one mode,
          // the returned result is provided as an array.
          // The Nelua version includes non-numbers.
          ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(t: auto): #[t.type]',
           '  assert(t.type.is_vector)',
           '  -- Source: http://lua-users.org/wiki/SimpleStats',
           '  local counts: #[t.type] = {}',
           '  for _, v in ipairs(t) do',
           '    if counts[v] == nil then',
           '      counts[v] = 1',
           '    else',
           '      counts[v] = counts[v] + 1',
           '    end',
           '  end',
           '  local biggestCount: uinteger = 0',
           '  for _, v  in pairs(counts) do',
           '    if v > biggestCount then',
           '      biggestCount = v',
           '    end',
           '  end',
           '  local temp: #[t.type] = {}',
           '  for k, v in pairs(counts) do',
           '    if v == biggestCount then',
           '      temp[#temp + 1] = k',
           '    end',
           '  end',
           '  return temp',
           'end']);
      break;

    case 'STD_DEV':
      functionName = Blockly.Nelua.provideFunction_(
          'math_standard_deviation',
          ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(t: auto): number',
           '  assert(t.type.is_vector)',
           '  local m: number',
           '  local vm: number',
           '  local total: number',
           '  local count: number',
           '  local result: number',
           '  m = #t == 0 and 0 or ' + provideSum() + '(t) / #t',
           '  for _, v in ipairs(t) do',
           "    if type(v) == 'number' then",
           '      vm = v - m',
           '      total = total + (vm * vm)',
           '      count = count + 1',
           '    end',
           '  end',
           '  result = math.sqrt(total / (count-1))',
           '  return result',
           'end']);
      break;

    case 'RANDOM':
      functionName = Blockly.Nelua.provideFunction_(
          'math_random_list',
          ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(t: auto)',
           '  assert(t.type.is_vector)',
           '  if #t == 0 then',
           '    return nil',
           '  end',
           '  return t[math.random(#t)]',
           'end']);
      break;

    default:
      throw Error('Unknown operator: ' + func);
  }
  return [functionName + '(' + list + ')', Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['math_modulo'] = function(block) {
  // Remainder computation.
  var argument0 = Blockly.Nelua.valueToCode(block, 'DIVIDEND',
      Blockly.Nelua.ORDER_MULTIPLICATIVE) || '0';
  var argument1 = Blockly.Nelua.valueToCode(block, 'DIVISOR',
      Blockly.Nelua.ORDER_MULTIPLICATIVE) || '0';
  var code = argument0 + ' % ' + argument1;
  return [code, Blockly.Nelua.ORDER_MULTIPLICATIVE];
};

Blockly.Nelua['math_constrain'] = function(block) {
  // Constrain a number between two limits.
  var argument0 = Blockly.Nelua.valueToCode(block, 'VALUE',
      Blockly.Nelua.ORDER_NONE) || '0';
  var argument1 = Blockly.Nelua.valueToCode(block, 'LOW',
      Blockly.Nelua.ORDER_NONE) || '-math.huge';
  var argument2 = Blockly.Nelua.valueToCode(block, 'HIGH',
      Blockly.Nelua.ORDER_NONE) || 'math.huge';
  var code = 'math.min(math.max(' + argument0 + ', ' + argument1 + '), ' +
      argument2 + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['math_random_int'] = function(block) {
  // Random integer between [X] and [Y].
  var argument0 = Blockly.Nelua.valueToCode(block, 'FROM',
      Blockly.Nelua.ORDER_NONE) || '0';
  var argument1 = Blockly.Nelua.valueToCode(block, 'TO',
      Blockly.Nelua.ORDER_NONE) || '0';
  var code = 'math.random(' + argument0 + ', ' + argument1 + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['math_random_float'] = function(block) {
  // Random fraction between 0 and 1.
  return ['math.random()', Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['math_atan2'] = function(block) {
  // Arctangent of point (X, Y) in degrees from -180 to 180.
  var argument0 = Blockly.Nelua.valueToCode(block, 'X',
      Blockly.Nelua.ORDER_NONE) || '0';
  var argument1 = Blockly.Nelua.valueToCode(block, 'Y',
      Blockly.Nelua.ORDER_NONE) || '0';
  return ['math.deg(math.atan2(' + argument1 + ', ' + argument0 + '))',
      Blockly.Nelua.ORDER_HIGH];
};
