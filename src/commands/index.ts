// import all local command files
import { helpCmd } from "./help"
import { versionCmd } from "./version";
import { initCmd } from "./init";
import { loginCmd } from "./login";
import { logoutCmd } from "./logout";
import { packageCmd } from "./package";

export default [
  helpCmd,
  versionCmd,
  initCmd,
  loginCmd,
  logoutCmd,
  packageCmd,
].map((cmd) => {
  // Set the command name to be the same as the file name
  cmd.name(cmd.name().replace(/-/g, ""));
  return cmd;
});