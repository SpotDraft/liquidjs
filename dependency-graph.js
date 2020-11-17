const Liquid = require("./index");
const Lexical = require("./src/lexical");

function createEngine() {
  return Liquid({});
}

function getTemplates(expression, engine) {
  const templates = engine.parse(expression);
  return templates;
}

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
      affectedVariables.push(dependencyData.defined);
      graph[dependency] = affectedVariables;
    });
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

module.exports = {
  parseAssign,
  getTemplates,
  createEngine,
  createDependencyTree,
};
