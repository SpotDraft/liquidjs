const operators = require('./operators.js')(isTruthy)
const lexical = require('./lexical.js')
const assert = require('../src/util/assert.js')

/**
 * Suffix unary operators that can be used in {% if %} expressions.
 *
 * These mirror the same-named filters in docx-templater/expressions.js so
 * that template authors can use identical syntax in both DOCX template tags
 * and Liquid computation text (common_cf_text).
 *
 * Semantics:
 *   isNotPresent  – true when the variable is null, undefined, or false
 *   isPresent     – true when the variable is NOT null, undefined, or false
 *
 * Usage in templates:
 *   {% if sd_thermal_risk_type isNotPresent %}
 *   {% if sd_some_field isPresent %}
 */
var SUFFIX_UNARY_OPERATORS = {
  isNotPresent: function (v) { return v === false || v === undefined || v === null },
  isPresent:    function (v) { return v !== false && v !== undefined && v !== null }
}

function evalExp (exp, scope) {
  assert(scope, 'unable to evalExp: scope undefined')
  var operatorREs = lexical.operators
  var match
  for (var i = 0; i < operatorREs.length; i++) {
    var operatorRE = operatorREs[i]
    var expRE = new RegExp(`^(${lexical.quoteBalanced.source})(${operatorRE.source})(${lexical.quoteBalanced.source})$`)
    if ((match = exp.match(expRE))) {
      var l = evalExp(match[1], scope)
      var op = operators[match[2].trim()]
      var r = evalExp(match[3], scope)
      return op(l, r)
    }
  }

  if ((match = exp.match(lexical.rangeLine))) {
    var low = evalValue(match[1], scope)
    var high = evalValue(match[2], scope)
    var range = []
    for (var j = low; j <= high; j++) {
      range.push(j)
    }
    return range
  }

  // Handle suffix unary operators: isNotPresent, isPresent
  // e.g. "sd_thermal_risk_type isNotPresent"
  var trimmedExp = exp.trim()
  for (var opName in SUFFIX_UNARY_OPERATORS) {
    if (trimmedExp.endsWith(' ' + opName)) {
      var operandStr = trimmedExp.slice(0, -(opName.length + 1)).trim()
      var val = evalValue(operandStr, scope)
      return SUFFIX_UNARY_OPERATORS[opName](val)
    }
  }

  return evalValue(exp, scope)
}

function evalValue (str, scope) {
  str = str && str.trim()
  if (!str) return undefined

  if (lexical.isLiteral(str)) {
    return lexical.parseLiteral(str)
  }
  if (lexical.isVariable(str)) {
    return scope.get(str)
  }
  throw new TypeError(`cannot eval '${str}' as value`)
}

function isTruthy (val) {
  return !isFalsy(val)
}

function isFalsy (val) {
  return val === false || undefined === val || val === null
}

function validateExpression(exp, scope, errors = []) {
  assert(scope, 'unable to evalExp: scope undefined')
  var operatorREs = lexical.operators
  var match;
  for (var i = 0; i < operatorREs.length; i++) {
    var operatorRE = operatorREs[i]
    var expRE = new RegExp(`^(${lexical.quoteBalanced.source})(${operatorRE.source})(${lexical.quoteBalanced.source})$`)
    if ((match = exp.match(expRE))) {
      errors.concat(validateExpression(match[1], scope, errors), validateExpression(match[3], scope, errors));
      return errors;
    }
  }

  // Handle suffix unary operators in validation
  var trimmedExp = exp.trim()
  for (var opName in SUFFIX_UNARY_OPERATORS) {
    if (trimmedExp.endsWith(' ' + opName)) {
      var operandStr = trimmedExp.slice(0, -(opName.length + 1)).trim()
      var valError = validateValue(operandStr, scope)
      if (valError) errors.push(valError)
      return errors;
    }
  }

  if((error = validateValue(exp, scope))) {
    errors.push(error);
  }
  return errors;
}

function validateValue (str, scope) {
  str = str && str.trim()
  if (!str) return `Invalid Operator Usage`;

  if (lexical.isLiteral(str)) {
    return;
  }
  if (lexical.isVariable(str)) {
    if(scope.get(str) !== undefined && scope.get(str) !== null) {
      return;
    } else {
      return `${str} variable not present`
    }
  }
  return `cannot eval '${str}' as value`
}

module.exports = {
  evalExp, evalValue, isTruthy, isFalsy, validateExpression, validateValue
}
