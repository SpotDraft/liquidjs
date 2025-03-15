const Lexical = require("./src/lexical");

function getTemplates(engine, expression) {
  const templates = engine.parse(expression);
  return templates;
}

/**
 - Validates if the given value can be parsed as JSON.
 - If the value is invalid, an error message is added to the validationErrors array.
 * @param {*} tpl - astObject
 * @param {*} value - value assigned to parseAssign statement
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

/**
 * traveres branches and elseTemplates for if templates
 */
function parseIf(ifTemplate, callback) {
  const impl = ifTemplate.tagImpl;
  impl.branches.forEach(function (branch) {
    callback(branch.templates);
  });
  if (impl.elseTemplates) {
    callback(impl.elseTemplates);
  }
}

function parseForOrUnless(tpl, callback) {
  const impl = tpl.tagImpl;
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
 */
function checkValidJSON(engine, expression) {
  const templates = getTemplates(engine, expression);
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

/**
 - checks if valid dynamic table by looking for presence of $$answer = something in each branch of conditional statements
 - adds errors to validation errors array
 * @param {*} expression - liquid expression
 */
function checkValidDynamicTable(engine, expression) {
  const templates = getTemplates(engine, expression);
  return processTopLevelConditionalBranches(templates);
}

/**
 * - Used for dynamic table validation
 * - Checks whether every top-level branch contains `$$answer = something`
 *
 * @example
 * if()
 *    $$answer = adskhjkashd
 * else if()
 *    $$answer = adskhjkashd
 * else
 *    asdasda
 *
 * - Should give an error since `$$answer` is missing in the last `else` block.
 * - Works for nested variables as well.
 *
 * @param {*} templates - AST templates
 */

function processTopLevelConditionalBranches(templates) {
  const outermostIfBlockTemplate = templates.find(
    (tpl) => tpl.type === "tag" && tpl.name === "if"
  );
  const combinedBranchesArray = combineBranchesAndElseTemplates(
    outermostIfBlockTemplate
  );

  return checkAllBranchesContainTarget(combinedBranchesArray);
}

/**
 * @example
 * ifTemplate - {type: 'tag', token: {…}, name: 'if', tagImpl: {…}}
 * tagImpl - {branches: Array(2), elseTemplates: Array(3)}
 * @returns combined array of branches and elseTemplate
 */
function combineBranchesAndElseTemplates(ifTemplate) {
  const branchesArray = [
    ...(ifTemplate?.tagImpl?.branches ?? []),
    ...(ifTemplate?.tagImpl?.elseTemplates
      ? [{ templates: ifTemplate.tagImpl.elseTemplates }]
      : []),
  ];
  return branchesArray;
}

/**
 * - checks whether all outer branches contain $$ answer assignment
 * @param {*} combinedBranchesArray - combined array of branches and elseTemplates
 * @returns
 */
function checkAllBranchesContainTarget(combinedBranchesArray) {
  const validationErrors = [];
  combinedBranchesArray.every((branch) => {
    if (!checkValidDynamicTableBranch(branch)) {
      validationErrors.push({
        branchCondition: `${branch.cond}`,
        errorMessage: `The above branch doesn't contain $$answer assignment expression`,
      });
      return false;
    }
    return true;
  });
  return validationErrors;
}

/**
 * - Checks if any of the templates in the branch contain $$answer assignment
 * - returns true as soon as it finds a match
 * @param {*} branch - branch object
 * @example
 * branch -  {cond: 'x', templates: Array(3)}
 *
 */
function checkValidDynamicTableBranch(branch) {
  return branch.templates.some((tpl) => checkTemplateContainsTarget(tpl));
}

/**
 * - checks if template type is html
 * - Extracts raw value of template and looks for presence of $$answer in it.
 * @param {*} template
 */
function checkTemplateContainsTarget(template) {
  const pattern = /\$\$\s*answer\s*=\s*/;

  if (template.type === "html") {
    const rawHtmlDataArray = template.raw
      ?.split("/n")
      .map((line) => line.trim())
      .filter((line) => line != "");
    return rawHtmlDataArray.some((str) => pattern.test(str));
  }

  if (template.type === "tag") {
    return handleTemplateTags(template);
  }
}

/**
 * - handles if, for and unless blocks and checks whether any of them have $$ answer
 */
function handleTemplateTags(tpl) {
  const handledTemplateTypes = ["if", "for", "unless"];
  if (!handledTemplateTypes.includes(tpl.name)) return;

  if (tpl.name === "if") {
    const combinedBranchesArray = combineBranchesAndElseTemplates(tpl);
    return combinedBranchesArray.some((branch) =>
      checkValidDynamicTableBranch(branch)
    );
  }

  if (["for", "unless"].includes(tpl.name)) {
    return tpl.tagImpl?.templates.some((currentTemplate) =>
      checkTemplateContainsTarget(currentTemplate)
    );
  }

  return false;
}

module.exports = {
  checkValidJSON,
  checkValidDynamicTable,
};
