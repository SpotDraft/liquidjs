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
 * Returns an array where the first item is the variable assigned
 * and the rest of the items are the variables used to define it.
 *
 * Literals are not returned.
 *
 * @param {*} assignTemplate : The template object representing an Assign tag
 * @param {*} engine: The liquid engine instance
 */
function parseAssign(assignTemplate, engine) {
  const definedVar = assignTemplate.tagImpl.key;
  const valueToken = engine.parser.parseValue(assignTemplate.tagImpl.value);
  let variables = [definedVar];
  if (valueToken.filters) {
    variables.push(valueToken.initial);
    valueToken.filters.forEach((filter) => {
      const notLiterals = filter.args.filter((arg) => {
        return !Lexical.isLiteral(arg);
      });
      variables = [...variables, ...notLiterals];
    });
  }
  return variables;
}

module.exports = {
  parseAssign,
  getTemplates,
  createEngine,
};
