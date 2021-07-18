/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Nelua for colour blocks.
 * @author rodrigoq@google.com (Rodrigo Queiro)
 */
'use strict';

goog.provide('Blockly.Nelua.colour');

goog.require('Blockly.Nelua');


Blockly.Nelua['colour_picker'] = function(block) {
  // Colour picker.
  var code = Blockly.Nelua.quote_(block.getFieldValue('COLOUR'));
  return [code, Blockly.Nelua.ORDER_ATOMIC];
};

Blockly.Nelua['colour_random'] = function(block) {
  // Generate a random colour.
  var code = 'string.format("#%06x", math.random(0, 2^24 - 1))';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['colour_rgb'] = function(block) {
  // Compose a colour from RGB components expressed as percentages.
  var functionName = Blockly.Nelua.provideFunction_(
      'colour_rgb',
      ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ + '(r: uinteger, g: uinteger, b: uinteger): string',
       '  r = math.floor(math.min(100, math.max(0, r)) * 2.55 + .5)',
       '  g = math.floor(math.min(100, math.max(0, g)) * 2.55 + .5)',
       '  b = math.floor(math.min(100, math.max(0, b)) * 2.55 + .5)',
       '  return string.format("#%02x%02x%02x", r, g, b)',
       'end']);
  var r = Blockly.Nelua.valueToCode(block, 'RED',
      Blockly.Nelua.ORDER_NONE) || 0;
  var g = Blockly.Nelua.valueToCode(block, 'GREEN',
      Blockly.Nelua.ORDER_NONE) || 0;
  var b = Blockly.Nelua.valueToCode(block, 'BLUE',
      Blockly.Nelua.ORDER_NONE) || 0;
  var code = functionName + '(' + r + ', ' + g + ', ' + b + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};

Blockly.Nelua['colour_blend'] = function(block) {
  // Blend two colours together.
  var functionName = Blockly.Nelua.provideFunction_(
      'colour_blend',
      ['local function ' + Blockly.Nelua.FUNCTION_NAME_PLACEHOLDER_ +
           '(colour1: string, colour2: string, ratio: uinteger): string',
       '  local r1: uinteger = tonumber(string.sub(colour1, 2, 3), 16)',
       '  local r2: uinteger = tonumber(string.sub(colour2, 2, 3), 16)',
       '  local g1: uinteger = tonumber(string.sub(colour1, 4, 5), 16)',
       '  local g2: uinteger = tonumber(string.sub(colour2, 4, 5), 16)',
       '  local b1: uinteger = tonumber(string.sub(colour1, 6, 7), 16)',
       '  local b2: uinteger = tonumber(string.sub(colour2, 6, 7), 16)',
       '  ratio = math.min(1, math.max(0, ratio))',
       '  local r: uinteger = math.floor(r1 * (1 - ratio) + r2 * ratio + .5)',
       '  local g: uinteger = math.floor(g1 * (1 - ratio) + g2 * ratio + .5)',
       '  local b: uinteger = math.floor(b1 * (1 - ratio) + b2 * ratio + .5)',
       '  return string.format("#%02x%02x%02x", r, g, b)',
       'end']);
  var colour1 = Blockly.Nelua.valueToCode(block, 'COLOUR1',
      Blockly.Nelua.ORDER_NONE) || '\'#000000\'';
  var colour2 = Blockly.Nelua.valueToCode(block, 'COLOUR2',
      Blockly.Nelua.ORDER_NONE) || '\'#000000\'';
  var ratio = Blockly.Nelua.valueToCode(block, 'RATIO',
      Blockly.Nelua.ORDER_NONE) || 0;
  var code = functionName + '(' + colour1 + ', ' + colour2 + ', ' + ratio + ')';
  return [code, Blockly.Nelua.ORDER_HIGH];
};
