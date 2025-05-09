import { program } from "..";
import { HELP_CMD_NAME } from "../global";

export const helpCmd = program
  .command(HELP_CMD_NAME)
  .description("Display detailed help information")
  .action(() => {
    program.outputHelp();
  });