#!/usr/bin/env node
import { Command } from "commander";
import { CLI_VERSION } from "./utils";
import { MAIN_CMD_NAME } from "./global";

export const program = new Command();

program
  .name(MAIN_CMD_NAME)
  .description("CLI for interacting with your bots")
  .version(CLI_VERSION);

// * Must be imported after program is initialized
import "./commands";

// * Must be imported after all commands are registered
program.parse(process.argv);