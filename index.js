#!/usr/bin/env node
import shelljs from "shelljs";
import chalk from "chalk";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import render from "./utils/templates.js";

const DIR_NAME = import.meta.dirname;

const TEMPLATE_OPTIONS = fs.readdirSync(path.join(DIR_NAME, "templates"));

const CURRENT_DIR = process.cwd();

const PROJECT_BUILD_QUESTIONS = [
  {
    name: "template",
    type: "list",
    message: "what type of project you want to generate",
    choices: TEMPLATE_OPTIONS,
  },
  {
    name: "project",
    type: "input",
    message: "set project name",
    validate: function (input) {
      const regex = /^([a-z@]{1}[a-z\-\.\\\/0-9]{0,213})+$/;
      if (regex.test(input)) {
        return true;
      }
      return "Project's name must be 214 characters or less, must start with lowercase or @ symbol";
    },
  },
];

inquirer.prompt(PROJECT_BUILD_QUESTIONS).then((answers) => {
  const { template, project } = answers;
  const templatePath = path.join(DIR_NAME, "templates", template);
  const pathTarget = path.join(CURRENT_DIR, project);

  if (!createProject(pathTarget)) return;
  createDirectoriesFilesContent(templatePath, project);
  postProcess(templatePath, pathTarget);
});

function createProject(projectPath) {
  if (fs.existsSync(projectPath)) {
    console.log(
      chalk.red("this project already exist, try again with another")
    );
    return false;
  }

  fs.mkdirSync(projectPath);
  return true;
}

function createDirectoriesFilesContent(templatePath, project) {
  const listFileDirectories = fs.readdirSync(templatePath);

  listFileDirectories.forEach((item) => {
    const originalPath = path.join(templatePath, item);
    const stats = fs.statSync(originalPath);

    const writePath = path.join(CURRENT_DIR, project, item);

    if (stats.isFile()) {
      let contents = fs.readFileSync(originalPath, "utf-8");
      contents = render(contents, { projectName: project });
      fs.writeFileSync(writePath, contents, "utf-8");

      const CREATE = chalk.green("CREATE ");
      const size = stats["size"];
      console.log(`${CREATE} ${originalPath} (${size} bytes)`);
    } else if (stats.isDirectory()) {
      fs.mkdirSync(writePath);
      createDirectoriesFilesContent(
        path.join(templatePath, item),
        path.join(project, item)
      );
    }
  });
}

function postProcess(templatePath, pathTarget) {
  const isNode = fs.existsSync(path.join(templatePath, "package.json"));

  if (isNode) {
    shelljs.cd(pathTarget);
    console.log(chalk.green(`installing dependencies in ${pathTarget}`));
    const result = shelljs.exec("npm install");
    if (result.code != 0) {
      return false;
    }
  }
}
