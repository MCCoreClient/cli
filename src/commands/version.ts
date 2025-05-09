import { program } from "..";
import { VERSION_CMD_NAME } from "../global";
import { CLI_VERSION } from "../utils";

export const versionCmd = program
  .command(VERSION_CMD_NAME)
  .description("Print the current CLI version")
  .action(() => {
    console.log(CLI_VERSION);
    process.exit(0);
  });