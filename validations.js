var depGraph = require("./dependency-graph.js");

function getTemplates(engine, expression) {
  const templates = engine.parse(expression);
  return templates;
}

/** checks if variables being used for computation have been defined before usage
 * Ex: For expression:  
 * {% if x %}
    {% if y %}
      {% assign c = x | times: b %}
 * Variable b is not defined so it will give error
 */
function checkVariableInComputation(engine, expression) {
  const templates = getTemplates(engine, expression);
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
    const parsedObj = depGraph.parseAssign(template, engine);

    parsedObj.dependsOn.forEach((varName) => {
      if (!assignedVars.has(varName)) {
        curErrors.push(
          `Variable "${varName}" used before assignment in expression "${template.token.args}" on line ${template.token.line}`
        );
      }
    });

    if (curErrors.length === 0) {
      assignedVars.add(parsedObj.defined);
    }
  }

  errorsArr.push(...curErrors);
}

module.exports = {
  checkVariableInComputation,
};
