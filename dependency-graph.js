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
 *
 * Returns a JSON Friendly object where keys are the variables and the values
 * is an array of variables that are affected by these variables.
 *
 * For example
 *
 * ```
 *   assign x = y + z
 *   assign a = y | times:2
 * ```
 *
 * will produce
 * ```
 * {
 *   y: [x, a],
 *   z: [x]
 * }
 * ```
 * @param text - the entire text
 */
function createDependencyTree(text) {
  const engine = createEngine();
  const templates = getTemplates(text, engine);
  const graph = {};
  templates.forEach(function (tpl) {
    parseTemplate(tpl, engine, graph);
  });
  return graph;
}

function parseTemplate(template, engine, graph) {
  if (template.name === "assign") {
    const dependencyData = parseAssign(template, engine);
    dependencyData.dependsOn.forEach(function (dependency) {
      const affectedVariables = graph[dependency] || [];
      if (!affectedVariables.includes(dependencyData.defined)) {
        affectedVariables.push(dependencyData.defined);
      }
      graph[dependency] = affectedVariables;
    });
  } else if (template.name === "if") {
    parseIf(template, engine, graph);
  }
}

/**
 * Returns an array where the first item is the variable assigned
 * and the rest of the items are the variables used to define it.
 *
 * Literals are not returned.
 *
 * @param {*} assignTemplate : The template object representing an Assign tag
 * @param {*} engine: The liquid engine instance
 *
 * @returns
 * ```
 * {
 *  // the variable defined
 *  defined,
 *  // the variables that the defined variable depends on (does not contain literals)
 *  dependsOn
 * }
 * ```
 */
function parseAssign(assignTemplate, engine) {
  const definedVar = assignTemplate.tagImpl.key;
  const valueToken = engine.parser.parseValue(assignTemplate.tagImpl.value);
  let variables = [];
  if (valueToken.filters) {
    if (!Lexical.isLiteral(valueToken.initial)) {
      variables.push(valueToken.initial);
    }
    valueToken.filters.forEach((filter) => {
      const notLiterals = filter.args.filter((arg) => {
        return !Lexical.isLiteral(arg);
      });
      variables = [...variables, ...notLiterals];
    });
  }
  return {
    defined: definedVar,
    dependsOn: variables,
  };
}

function parseIf(ifTemplate, engine, graph) {
  const impl = ifTemplate.tagImpl;
  impl.branches.forEach(function (branch) {
    branch.templates.forEach(function (tpl) {
      parseTemplate(tpl, engine, graph);
    });
  });
  impl.elseTemplates.forEach(function (tpl) {
    parseTemplate(tpl, engine, graph);
  });
}

function _internal_getAffectedVariables(tree, inputVar, values) {
  function hasDependenantVars(variable) {
    const items = tree[variable];
    return items && items.length > 0;
  }
  const topLevel = tree[inputVar];
  if (!hasDependenantVars(inputVar)) {
    return [];
  }
  topLevel
    .filter((variable) => variable !== inputVar)
    .forEach(function (variable) {
      values.push(variable);
      if (hasDependenantVars(variable)) {
        const _affected = _internal_getAffectedVariables(
          tree,
          variable,
          values
        );
        values = [...values, ..._affected];
      }
    });
  return values;
}

/**
 *
 * Returns a list of all variables affected by input variable.
 * Example -
 *
 * ```
 *  assign x = a + z
 *  assign y = a | times:2
 *  assign t = x | times: 3
 * ```
 *
 * for `getAffectedVariables(a)` returns => `[x,y,t]`
 *
 * @param tree : The dependency tree created using `createDependencyTree`
 * @param inputVar : The variable to check
 */
function getAffectedVariables(tree, inputVar) {
  const values = _internal_getAffectedVariables(tree, inputVar, []);
  return Array.from(new Set(values));
}

module.exports = {
  parseAssign,
  getTemplates,
  createEngine,
  createDependencyTree,
  getAffectedVariables,
};
