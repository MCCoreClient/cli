import path from "path";
import { program } from "..";
import { functions } from "../firebase";
import { AUTH_FILE_NAME, LOGIN_CMD_NAME, MAIN_CMD_NAME } from "../global";
import fs from "fs/promises";
import { getAuth, requestCustomToken } from "../utils";
import { logoutCmd } from "./logout";

export const loginCmd = program
  .command(LOGIN_CMD_NAME)
  .description("Authenticate using an access token")
  .argument("<token>", "access token obtained from the web dashboard")
  .action(async (accessToken: string) => {
    console.log("Authenticating...");

    // Check if the user is already logged in
    if (await getAuth()) {
      console.error(`You're already logged in. Use '${MAIN_CMD_NAME} ${logoutCmd.name()}' to logout first.`);
      process.exit(1);
    }

    // Check if the access token is valid
    const token = await requestCustomToken(functions, accessToken)
      .catch((error) => {
        console.error("Something went wrong: ", error);
        process.exit(1);
      });

    // If the token is null, the access token is invalid
    if (!token) {
      console.error("Failed to authenticate");
      process.exit(1);
    }

    // Create the auth file using the access token
    await createAuthFile(accessToken)

    console.log("Authenticated successfully");
    process.exit(0);
  });

// ==================================================================
// ======================= Helper functions =========================
// ==================================================================

async function createAuthFile(accessToken: string) {
  const authFilePath = path.join(process.cwd(), AUTH_FILE_NAME);

  await fs.writeFile(authFilePath, JSON.stringify({ accessToken }));
}