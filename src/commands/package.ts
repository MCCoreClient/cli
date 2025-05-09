import { firestore, auth, functions } from "../firebase";
import { program } from "..";
import fg from "fast-glob";
import { MAIN_CMD_NAME, PACKAGE_CMD_NAME } from "../global";
import { getAuthAndAuthenticate } from "../utils";
import { loginCmd } from "./login";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import path from "path";
import { readFile } from "fs/promises";
import { promises as fs } from "fs";

enum PackageTask {
  UPLOAD = "upload",
  REMOVE = "remove",
  LIST = "list",
}
const TASKS_LIST = Object.values(PackageTask).map((task) => task.toLowerCase()).join(", ");

export const packageCmd = program
  .command(PACKAGE_CMD_NAME)
  .description("Manage your packages")
  .argument("[task]", `task to perform: ${TASKS_LIST}`)
  .option("-n, --name <name>", "package name")
  .option("-v, --version <version>", "package version")
  .option("-h, --help", "display help for command")
  .action(async (task: PackageTask, options: { name: string; version: string; help: boolean }) => {
    // Display help if --help is passed
    if (options.help) {
      packageCmd.help();
      return;
    }

    // Check if task is provided
    if (!task) {
      console.error("Please provide a task: " + TASKS_LIST);
      process.exit(1);
    }

    try {
      // Use the task to determine which subcommand to run
      switch (task) {
        case PackageTask.UPLOAD:
          await uploadSubcommand();
          break;
        case PackageTask.REMOVE:
          await removeSubcommand(options.name, options.version);
          break;
        case PackageTask.LIST:
          await listSubcommand();
          break;
        default:
          console.error("Invalid task. Please provide a valid task: " + TASKS_LIST);
          process.exit(1);
      }
    } catch (err: any) {
      if (err.code === "permission-denied") {
        console.error("You don't have permission to perform this action.");
      } else {
        console.error("An error occurred:", err);
      }
      process.exit(1);
    }
  });

async function uploadSubcommand() {
    console.log("(1/4) Authenticating...");
    const userUid = await authenticate()

    // Flatten the project files
    console.log("(2/4) Reading project files...");
    const flattenedCode = await flattenProject(process.cwd())
      .catch((err) => {
        console.error("Failed reading project files", err);
        process.exit(1);
      });

    // Get local package name and version
    console.log("(3/4) Searching for package.json...");
    const packageJson = await getLocalPackageJson();
    if (!packageJson) {
      console.error("No package.json found in the current directory.");
      process.exit(1);
    }
    const { name, version } = packageJson;
    if (!name || !version) {
      console.error("package.json must contain a name and version field.");
      process.exit(1);
    }

    // Send the flattened project to the server
    console.log("(4/4) Uploading package...");
    const docRef = doc(firestore, `users/${userUid}/packages`, name + "<" + version + ">");
    await setDoc(docRef, { code: flattenedCode })
      .then(() => {
        console.log("Package uploaded successfully.");
        process.exit(0);
      })
}

async function removeSubcommand(name: string, version: string) {
  if (!name && !version) {
    removeUsingLocalFiles();
  } else if (name && version) {
    removeUsingOptions(name, version);
  } else {
    console.error("Please provide both name and version or none.");
    process.exit(1);
  }

  async function removeUsingOptions(name: string, version: string) {
    console.log("(1/2) Authenticating...");
    const userUid = await authenticate()

    // Remove the package from the server
    console.log("(2/2) Removing package...");
    await removeFromServer(name, version, userUid)
      .then(() => {
        console.log("Package removed successfully.");
        process.exit(0);
      })
  }

  async function removeUsingLocalFiles() {
    console.log("(1/3) Authenticating...");
    const userUid = await authenticate()

    // Get local package name and version
    console.log("(2/3) Searching for package.json...");
    const packageJson = await getLocalPackageJson();
    if (!packageJson) {
      console.error("No package.json found in the current directory.");
      process.exit(1);
    }
    const { name, version } = packageJson;
    if (!name || !version) {
      console.error("package.json must contain a name and version field.");
      process.exit(1);
    }

    // Remove the package from the server
    console.log("(3/3) Removing package...");
    await removeFromServer(name, version, userUid)
      .then(() => {
        console.log("Package removed successfully.");
        process.exit(0);
      })
  }
}

async function listSubcommand() {
  console.log("(1/2) Authenticating...");
  const userUid = await authenticate()

  // List the packages from the server
  console.log("(2/2) Listing packages...");
  const colRef = collection(firestore, `users/${userUid}/packages`);
  await getDocs(colRef)
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        console.log("No packages found.");
        process.exit(0);
      }
      querySnapshot.forEach((doc) => {
        const name = doc.id.split("<")[0];
        const version = doc.id.split("<")[1].slice(0, -1);
        console.log(`Package: ${name} (v${version})`);
      });
      process.exit(0);
    })
}

// ==================================================================
// ======================= Helper functions =========================
// ==================================================================

/**
 * Authenticates the user using the auth file
 * @returns The user UID
 */
async function authenticate(): Promise<string> {
  // Read the auth file
  const userUid = await getAuthAndAuthenticate(functions, auth)
    .catch((err) => {
      console.error("Authentication failed:", err);
      process.exit(1);
    })

  // Check if the user is authenticated
  if (!userUid) {
    console.error(`Authentication failed. Please run "${MAIN_CMD_NAME} ${loginCmd.name()}" to authenticate.`);
    process.exit(1);
  }

  return userUid;
}

/**
 * Removes a package from the server
 * @param name The name of the package
 * @param version The version of the package
 * @param userUid The user UID
 */
async function removeFromServer(name: string, version: string, userUid: string) {
  // Remove the package from the server
  const docRef = doc(firestore, `users/${userUid}/packages`, name + "<" + version + ">");

  // Check if the package exists
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    console.error("Package not found.");
    process.exit(1);
  }

  // Remove the package from the server
  await deleteDoc(docRef)
    .then(() => {
      console.log("Package removed successfully.");
      process.exit(0);
    })
}

/**
 * Gets the package.json file from the current working directory
 */
export async function getLocalPackageJson(): Promise<any | null> {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  try {
    const data = await readFile(packageJsonPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Flattens a project directory into a single concatenated code string.
 *
 * @param rootDir  The directory whose files should be flattened. Defaults to CWD.
 * @param patterns Additional glob patterns to include (defaults to common code extensions).
 * @param ignore   Glob patterns to exclude (defaults to node_modules, dist, etc.).
 * @returns        A Promise resolving to the flattened code string.
 */
export async function flattenProject(
  rootDir: string = process.cwd(),
  patterns: string[] = ["**/*.{ts,js}"] ,
  ignore: string[] = [
    "node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/*.map",
    "package-lock.json",
    "yarn.lock",
  ]
): Promise<string> {
  const entries = await fg(patterns, { cwd: rootDir, ignore, dot: false, onlyFiles: true });

  let flattened = "";
  for (const relPath of entries.sort()) {
    const absPath = path.join(rootDir, relPath);
    const content = await fs.readFile(absPath, "utf8");
    flattened += `\n// ===== FILE: ${relPath} =====\n` + content + "\n";
  }
  return flattened.trim();
}