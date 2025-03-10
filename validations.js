const { parseAssign } = require("./dependency-graph");
const Liquid = require("./index");
const Lexical = require("./src/lexical");

function createEngine() {
  return Liquid({});
}

function getTemplates(expression, engine) {
  const templates = engine.parse(expression);
  return templates;
}

/**
 - Validates if the given value can be parsed as JSON.
 - If the value is invalid, an error message is added to the validationErrors array.
 - We are passing non-literal RHS values through json.parse to get the exact error message
 * @param {*} engine 
 * @param {*} tpl 
 * @param {*} value 
 * @param {*} validationErrors 
 */
function validateJSON(engine, tpl, value, validationErrors) {
  try {
    const trimmedValue = value.trim();

    if (!Lexical.isLiteral(trimmedValue)) {
      throw new Error("Invalid value assigned to parseAssign statement");
    }
    const evalValue = engine.evalValue(trimmedValue, {});
    const jsonStr = `{"val": ${
      typeof evalValue === "string" ? JSON.stringify(evalValue) : evalValue
    }}`;

    JSON.parse(jsonStr);
  } catch (e) {
    validationErrors.push({
      expression: `${tpl.name} ${tpl.tagImpl.key} = ${tpl.tagImpl.value}`,
      errorMessage: `${e.message} at line ${tpl.token.line}`,
    });
  }
}

function parseIf(ifTemplate, callback) {
  const impl = ifTemplate.tagImpl;
  impl.branches.forEach(function (branch) {
    callback(branch.templates);
  });
  if (impl.elseTemplates) {
    callback(impl.elseTemplates);
  }
}

function parseForOrUnless(forTemplate, callback) {
  const impl = forTemplate.tagImpl;
  if (impl.templates) {
    callback(impl.templates);
  }
  if (impl.elseTemplates) {
    callback(impl.elseTemplates);
  }
}

/**
 - checks if valid JSON object has been passed to parseAssign statement
 - adds errors to validation errors array
 * @param {*} expression - liquid expression
 * @returns 
 */
function checkValidJSON(expression) {
  const engine = createEngine();
  const templates = getTemplates(expression, engine);
  let validationErrors = [];

  function processTemplates(templates) {
    templates.forEach((tpl) => {
      if (tpl.name === "parseAssign") {
        validateJSON(engine, tpl, tpl.tagImpl.value, validationErrors);
      } else if (tpl.name === "if") {
        parseIf(tpl, processTemplates);
      } else if (tpl.name === "for" || tpl.name === "unless") {
        parseForOrUnless(tpl, processTemplates);
      }
    });
  }

  processTemplates(templates);
  return validationErrors;
}

/** checks if variables being used for computation have been defined before usage
 * Ex: For expression:  
 * {% if x %}
    {% if y %}
      {% assign c = x | times: b %}
 * Variable b is not defined so it will give error
 */
function checkVariableInComputation(expression) {
  const engine = createEngine();

  const templates = getTemplates(expression, engine);
  let assignedVars = new Set(); // Track variables that have been assigned
  let errorsArr = []; // Store errors for undefined variable usage

  templates.forEach((tpl) => {
    if (tpl.type === "tag") {
      checkVariableInComputationHelper(engine, tpl, assignedVars, errorsArr);
    }
  });

  return errorsArr;
}

/**
 * Recursively checks variables in the computation.
 * Ensures variables are used only after they have been assigned.
 *
 * @param {Object} template - The current template node being processed
 * @param {Set} assignedVars - Set of variables that have been assigned so far
 */
function checkVariableInComputationHelper(
  engine,
  template,
  assignedVars,
  errorsArr
) {
  const currentSet = new Set(assignedVars);
  let curErrors = [];

  if (template.name === "if") {
    /**
     * Get variable used in if condition and add it to predefined vars set
     * Ex: for the case if (x===some conditon), adds x to set
     */
    const conditionVar = template.token?.args;
    if (conditionVar) currentSet.add(conditionVar);

    if (template.tagImpl.branches) {
      template.tagImpl.branches.forEach((branch) => {
        currentSet.add(branch.cond[0]);
        branch.templates.forEach((tpl) => {
          if (tpl.type === "tag") {
            checkVariableInComputationHelper(
              engine,
              tpl,
              currentSet,
              errorsArr
            );
          }
        });
      });
    }

    if (template.tagImpl.elseTemplates) {
      template.tagImpl.elseTemplates.forEach((tpl) => {
        if (tpl.type === "tag") {
          checkVariableInComputationHelper(engine, tpl, currentSet, errorsArr);
        }
      });
    }
  } else if (template.name === "assign") {
    const parsedObj = parseAssign(template, engine);

    parsedObj.dependsOn.forEach((varName) => {
      if (!assignedVars.has(varName)) {
        curErrors.push(
          `Variable "${varName}" used before assignment in expression "${template.token.args}" on line ${template.token.line}`
        );
      }
    });

    // If there are no errors, add the newly defined variable to the set
    if (curErrors.length === 0) {
      assignedVars.add(parsedObj.defined);
    }
  }

  errorsArr.push(...curErrors);
}

module.exports = {
  checkValidJSON,
  checkVariableInComputation,
};
