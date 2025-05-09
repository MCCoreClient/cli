import path from "path";
import { program } from "..";
import { AUTH_FILE_NAME, LOGOUT_CMD_NAME } from "../global";
import fs from "fs/promises";
import { getAuth } from "../utils";

export const logoutCmd = program
  .command(LOGOUT_CMD_NAME)
  .description("Logout of current session")
  .action(async () => {
    // User not logged in if the auth file does not exist
    if (!(await getAuth())) {
      console.error('You\'re not currently logged in.');
      process.exit(1);
    }

    // Delete the local auth file
    const authFilePath = path.join(process.cwd(), AUTH_FILE_NAME);
    await fs.rm(authFilePath)
      .catch((err) => {
        console.error(`Error deleting auth file: ${err}`);
        process.exit(1);
      });

    console.log("Logged out successfully.");
  });