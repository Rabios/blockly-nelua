/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Helper functions for generating Nelua for blocks.
 * @author rodrigoq@google.com (Rodrigo Queiro)
 * Based on Ellen Spertus's blocky-lua project.
 */
'use strict';

goog.provide('Blockly.Nelua');

goog.require('Blockly.Generator');
goog.require('Blockly.inputTypes');
goog.require('Blockly.utils.object');
goog.require('Blockly.utils.string');


/**
 * Nelua code generator.
 * @type {!Blockly.Generator}
 */
Blockly.Nelua = new Blockly.Generator('Nelua');

/**
 * List of illegal variable names.
 * This is not intended to be a security feature.  Blockly is 100% client-side,
 * so bypassing this list is trivial.  This is intended to prevent users from
 * accidentally clobbering a built-in object or function.
 * @private
 */
Blockly.Nelua.addReservedWords(
    // Special character
    '_,' +
    // From theoriginalbit's script:
    // https://github.com/espertus/blockly-lua/issues/6
    '__inext,assert,bit,colors,colours,coroutine,disk,dofile,error,fs,' +
    'fetfenv,getmetatable,gps,help,io,ipairs,keys,loadfile,loadstring,math,' +
    'native,next,os,paintutils,pairs,parallel,pcall,peripheral,print,' +
    'printError,rawequal,rawget,rawset,read,rednet,redstone,rs,select,' +
    'setfenv,setmetatable,sleep,string,term,textutils,tonumber,' +
    'tostring,turtle,type,unpack,vector,hashmap,write,xpcall,_VERSION,__indext,' +
    // Not included in the script, probably because it wasn't enabled:
    'HTTP,' +
    // Keywords (http://www.lua.org/pil/1.3.html).
    'and,break,do,else,elseif,end,false,for,function,if,in,local,nil,not,or,' +
    'repeat,return,then,true,until,while,' +
    // Metamethods (http://www.lua.org/manual/5.2/manual.html).
    'add,sub,mul,div,mod,pow,unm,concat,len,eq,lt,le,index,newindex,call,' +
    // Basic functions (http://www.lua.org/manual/5.2/manual.html, section 6.1).
    'assert,collectgarbage,dofile,error,_G,getmetatable,inpairs,load,' +
    'loadfile,next,pairs,pcall,print,rawequal,rawget,rawlen,rawset,select,' +
    'setmetatable,tonumber,tostring,type,_VERSION,xpcall,' +
    // Modules (http://www.lua.org/manual/5.2/manual.html, section 6.3).
    'require,package,string,vector,hashmap,math,bit32,io,file,os,debug'
);

/**
 * Order of operation ENUMs.
 * http://www.lua.org/manual/5.3/manual.html#3.4.8
 */
Blockly.Nelua.ORDER_ATOMIC = 0;          // literals
// The next level was not explicit in documentation and inferred by Ellen.
Blockly.Nelua.ORDER_HIGH = 1;            // Function calls, tables[]
Blockly.Nelua.ORDER_EXPONENTIATION = 2;  // ^
Blockly.Nelua.ORDER_UNARY = 3;           // not # - ~
Blockly.Nelua.ORDER_MULTIPLICATIVE = 4;  // * / %
Blockly.Nelua.ORDER_ADDITIVE = 5;        // + -
Blockly.Nelua.ORDER_CONCATENATION = 6;   // ..
Blockly.Nelua.ORDER_RELATIONAL = 7;      // < > <=  >= ~= ==
Blockly.Nelua.ORDER_AND = 8;             // and
Blockly.Nelua.ORDER_OR = 9;              // or
Blockly.Nelua.ORDER_NONE = 99;

/**
 * Note: Nelua is not supporting zero-indexing since the language itself is
 * one-indexed, so the generator does not repoct the oneBasedIndex configuration
 * option used for lists and text.
 */

/**
 * Whether the init method has been called.
 * @type {?boolean}
 */
Blockly.Nelua.isInitialized = false;

/**
 * Initialise the database of variable names.
 * @param {!Blockly.Workspace} workspace Workspace to generate code from.
 */
Blockly.Nelua.init = function(workspace) {
  // Call Blockly.Generator's init.
  Object.getPrototypeOf(this).init.call(this);

  if (!this.nameDB_) {
    this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_);
  } else {
    this.nameDB_.reset();
  }
  this.nameDB_.setVariableMap(workspace.getVariableMap());
  this.nameDB_.populateVariables(workspace);
  this.nameDB_.populateProcedures(workspace);

  this.isInitialized = true;
};

/**
 * Prepend the generated code with the variable definitions.
 * @param {string} code Generated code.
 * @return {string} Completed code.
 */
Blockly.Nelua.finish = function(code) {
  if (code) {
    code = this.prefixLines(code, /*this.INDENT*/"");
  }
  
  // Convert the definitions dictionary into a list.
  var definitions = Blockly.utils.object.values(this.definitions_);
  // Call Blockly.Generator's finish.
  code = Object.getPrototypeOf(this).finish.call(this, code);
  this.isInitialized = false;

  this.nameDB_.reset();
  return 'require \"string\"\nrequire \"math"\nrequire \"vector\"\nrequire \"io\"\n\n' + definitions.join('\n\n') + '\n' + code;
};

/**
 * Naked values are top-level blocks with outputs that aren't plugged into
 * anything. In Nelua, an expression is not a legal statement, so we must assign
 * the value to the (conventionally ignored) _.
 * http://lua-users.org/wiki/ExpressionsAsStatements
 * @param {string} line Line of generated code.
 * @return {string} Legal line of code.
 */
Blockly.Nelua.scrubNakedValue = function(line) {
  return 'local _ = ' + line + '\n';
};

/**
 * Encode a string as a properly escaped Nelua string, complete with
 * quotes.
 * @param {string} string Text to encode.
 * @return {string} Nelua string.
 * @protected
 */
Blockly.Nelua.quote_ = function(string) {
  string = string.replace(/\\/g, '\\\\')
                 .replace(/\n/g, '\\\n')
                 .replace(/'/g, '\\\'');
  return '\'' + string + '\'';
};

/**
 * Encode a string as a properly escaped multiline Nelua string, complete with
 * quotes.
 * @param {string} string Text to encode.
 * @return {string} Nelua string.
 * @protected
 */
Blockly.Nelua.multiline_quote_ = function(string) {
  var lines = string.split(/\n/g).map(this.quote_);
  // Join with the following, plus a newline:
  // .. '\n' ..
  return lines.join(' .. \'\\n\' ..\n');
};

/**
 * Common tasks for generating Nelua from blocks.
 * Handles comments for the specified block and any connected value blocks.
 * Calls any statements following this block.
 * @param {!Blockly.Block} block The current block.
 * @param {string} code The Nelua code created for this block.
 * @param {boolean=} opt_thisOnly True to generate code for only this statement.
 * @return {string} Nelua code with comments and subsequent blocks added.
 * @protected
 */
Blockly.Nelua.scrub_ = function(block, code, opt_thisOnly) {
  var commentCode = '';
  // Only collect comments for blocks that aren't inline.
  if (!block.outputConnection || !block.outputConnection.targetConnection) {
    // Collect comment for this block.
    var comment = block.getCommentText();
    if (comment) {
      comment = Blockly.utils.string.wrap(comment, this.COMMENT_WRAP - 3);
      commentCode += this.prefixLines(comment, '-- ') + '\n';
    }
    // Collect comments for all value arguments.
    // Don't collect comments for nested statements.
    for (var i = 0; i < block.inputList.length; i++) {
      if (block.inputList[i].type == Blockly.inputTypes.VALUE) {
        var childBlock = block.inputList[i].connection.targetBlock();
        if (childBlock) {
          comment = this.allNestedComments(childBlock);
          if (comment) {
            commentCode += this.prefixLines(comment, '-- ');
          }
        }
      }
    }
  }
  var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  var nextCode = opt_thisOnly ? '' : this.blockToCode(nextBlock);
  return commentCode + code + nextCode;
};
