const moment = require("moment");
const { getType, SD_CUSTOM_TYPES } = require("../type-assert");

function dateEquals(l, r) {
  const lType = getType(l);
  const rType = getType(r);

  if (lType !== rType) {
    return false;
  }

  if (lType !== SD_CUSTOM_TYPES.date) {
    return false;
  }

  return moment.utc(l).isSame(moment.utc(r));
}

function durationEquals(l, r) {
  const lType = getType(l);
  const rType = getType(r);

  if (lType !== rType) {
    return false;
  }

  if (lType !== SD_CUSTOM_TYPES.duration) {
    return false;
  }

  return l.days === r.days;
}

function currencyEquals(l, r) {
  const lType = getType(l);
  const rType = getType(r);

  if (lType !== rType) {
    return false;
  }

  if (lType !== SD_CUSTOM_TYPES.currency) {
    return false;
  }

  return l.value === r.value && l.type === r.type;
}

function phoneNumberEquals(l, r) {
  const lType = getType(l);
  const rType = getType(r);

  if (lType !== rType) {
    return false;
  }

  if (lType !== SD_CUSTOM_TYPES.phoneNumber) {
    return false;
  }

  return l.number === r.number && l.code === r.code;
}

/**
 * Sorts the array using default JS sorting method.
 * Loops through the sorted arrays and checks whether they have same items at same index.
 * Empty array is considered equal to another empty array
 */
function arrayEquals(l, r) {
  const lType = getType(l);
  const rType = getType(r);

  if (lType !== rType) {
    return false;
  }

  if (lType !== SD_CUSTOM_TYPES.array) {
    return false;
  }

  if (l.length !== r.length) {
    return false;
  }

  // Empty array should be equal to another empty array
  if (l.length === 0) {
    return true;
  }

  const sortedL = [...l].sort();
  const sortedR = [...r].sort();

  return sortedL.every((val, idx) => {
    return val === sortedR[idx];
  });
}

/**
 * Default equality handler for primitive values.
 *
 * Treats `null` and `undefined` as equivalent — both represent an absent/nil value.
 * This aligns with JavaScript's loose-equality semantics for nil (`null == undefined`)
 * and fixes the IS_PRESENT computation bug where a questionnaire field initialised as
 * `null` (never filled) was being treated as "present" because:
 *   `NIL` (undefined variable) → `undefined`
 *   `null !== undefined`        → `true`  ← incorrect: null should equal NIL
 *
 * Examples:
 *   defaultHandler(null, undefined)  → true  (both are nil)
 *   defaultHandler(null, null)       → true
 *   defaultHandler(undefined, undefined) → true
 *   defaultHandler(0, null)          → false  (0 is a real value, not nil)
 *   defaultHandler(0, false)         → false  (unchanged strict equality)
 */
function defaultHandler(l, r) {
  const lIsNil = l === null || l === undefined;
  const rIsNil = r === null || r === undefined;

  // Both nil → equal
  if (lIsNil && rIsNil) return true;
  // Only one nil → not equal
  if (lIsNil !== rIsNil) return false;
  // Neither nil → strict equality
  return l === r;
}

function equals(l, r) {
  const lType = getType(l);
  const rType = getType(r);

  if (lType !== rType) {
    return defaultHandler(l, r);
  }

  switch (lType) {
    case SD_CUSTOM_TYPES.array:
      return arrayEquals(l, r);
    case SD_CUSTOM_TYPES.duration:
      return durationEquals(l, r);
    case SD_CUSTOM_TYPES.date:
      return dateEquals(l, r);
    case SD_CUSTOM_TYPES.currency:
      return currencyEquals(l, r);
    case SD_CUSTOM_TYPES.phoneNumber:
      return phoneNumberEquals(l, r);
    default:
      return defaultHandler(l, r);
  }
}

module.exports = equals;
