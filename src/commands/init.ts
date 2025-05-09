import { program } from "..";
import { REPO_URL } from "../utils";
import inquirer from "inquirer";
import path from "path";
import { dirExists } from "../utils";
import { INIT_CMD_NAME } from "../global";
import fs from "fs";
import fsPromises from "fs/promises";

const PACKAGE_JSON_PACKAGE_NAME_PLACEHOLDER = "{{packageName}}";
const templateNames = getTemplateNames();

if (!templateNames) {
  console.error(
    "No templates found. Please reinstall the CLI or check your installation." +
    "\nIf this continues, please open an issue on GitHub: " + REPO_URL + "/issues"
  );
  process.exit(1);
}

export const initCmd = program
  .command(INIT_CMD_NAME)
  .description("Initialize a new package")
  .option("-n, --name <name>", "package name")
  .option("-t, --template <name>", "package template: " + templateNames.join("/"))
  .option("-f, --force", "overwrite existing directory if present")
  .option("-s, --skip", "skip interactive prompts", false)
  .option("-h, --help", "display help for command")
  .action(async (options: { name: string, template: string; force: boolean; skip: boolean; help: boolean }) => {
    // Display help if --help is passed
    if (options.help) {
      initCmd.help();
      return;
    }

    try {
      // Step 1: project name ---------------------------------------------------
      let { name } = options;
      if (!name && !options.skip) {
        const { pkgName } = await inquirer.prompt([
          {
            type: "input",
            name: "pkgName",
            message: "Package name:",
            default: "my-app",
            validate: (input: string) => !!input || "Name cannot be empty"
          }
        ]);
        name = pkgName;
      }

      // Step 2: template selection --------------------------------------------
      let { template } = options;
      if ((!template || !templateNames.includes(template)) && !options.skip) {
        const { chosen } = await inquirer.prompt([
          {
            type: "list",
            name: "chosen",
            message: "Select a template:",
            choices: templateNames
          }
        ]);
        template = chosen;
        console.log(`Selected template: ${template}`);
      }

      // Step 3: confirm overwrite if dir exists --------------------------------
      const targetDir = path.resolve(name!);
      let force = options.force ?? false;
      if ((await dirExists(targetDir)) && !force && !options.skip) {
        const { overwrite } = await inquirer.prompt([
          {
            type: "confirm",
            name: "overwrite",
            message: `Directory \"${name}\" already exists. Overwrite?`,
            default: false
          }
        ]);
        force = overwrite;
        if (!force) {
          console.log("Aborted ✖️");
          process.exit(1);
        }
      }

      console.log("Initializing new package...");
      await copyTemplate(name, name, template, force)
        .then(() => {
          console.log("Package initialized.");
        })
        .catch((err) => {
          console.error("Initialization failed:", err);
        });
    } catch (err: any) {
      // Inquirer throws on Ctrl+C while prompt active (err.isTtyError stays false)
      if (err.name === 'ExitPromptError') {
        console.log("\n✖️  Aborted");
        process.exit(130);
      }

      console.error("Something went wrong:", err);
    }
  });

// ==================================================================
// ======================= Helper functions =========================
// ==================================================================

export function getTemplateNames(): string[] | null {
  const templatesDir = path.join(__dirname, "../../templates");

  try {
    return fs.readdirSync(templatesDir).filter((file) => {
      const filePath = path.join(templatesDir, file);
      return fs.statSync(filePath).isDirectory();
    });
  } catch (error) {
    return null;
  }
}

/**
 * Scaffold a new package from a template.
 *
 * Template directory structure (inside this package):
 *   templates/
 *     default/
 *       package.json
 *       tsconfig.json
 *       src/index.ts
 *
 * @param packageName - The name of the package to be created.
 * @param relativePath - The relative path where the package will be created.
 * @param templateName - The name of the template to use (default: "default").
 * @param force - Whether to overwrite the existing directory if it exists (default: false).
 */
export async function copyTemplate(
  packageName: string,
  relativePath: string,
  templateName: string = "default",
  force = false
): Promise<void> {
  const absDir = path.resolve(relativePath);
  const templateDir = path.join(__dirname, "../../templates", templateName);

  // Ensure template exists
  try {
    await fsPromises.access(templateDir);
  } catch {
    console.error(`❌  Template \"${templateName}\" not found at ${templateDir}`);
    process.exit(1);
  }

  // Handle existing targetDir
  try {
    await fsPromises.access(absDir);
    if (!force) {
      console.error(`❌  Directory \"${absDir}\" already exists. Use --force to overwrite.`);
      process.exit(1);
    }
    await fsPromises.rm(absDir, { recursive: true, force: true });
  } catch {
    /* dir does not exist => OK */
  }

  // Copy recursively (Node 16+)
  await fsPromises.cp(templateDir, absDir, { recursive: true });

  // Update package.json with project name
  const pkgPath = path.join(absDir, "package.json");
  const txt = await fsPromises.readFile(pkgPath, "utf-8");
  const updatedTxt = txt.replace(
    PACKAGE_JSON_PACKAGE_NAME_PLACEHOLDER,
    packageName
  );
  await fsPromises.writeFile(pkgPath, updatedTxt);

  console.log(`✅  Project created from \"${templateName}\" template at ${absDir}`);
}