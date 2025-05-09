import path from "path";
import packageJson from "../package.json"; // requires "resolveJsonModule": true in tsconfig.json
import { AuthFile } from "./types";
import { AUTH_FILE_NAME } from "./global";
import { Auth, signInWithCustomToken } from "firebase/auth";
import { access, readFile } from "fs/promises";
import { Functions } from "firebase/functions";
import { httpsCallable } from "firebase/functions";
import { assert } from "console";

export const CLI_VERSION: string = (packageJson as { version: string }).version;
export const REPO_URL: string = (packageJson as { repository: { url: string } }).repository.url;

/**
 * Checks if a directory exists
 * For some reason, fs.exists is deprecated, so we use fs.access instead
 */
export async function dirExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the auth file from the current working directory
 */
export async function getAuth(): Promise<AuthFile | null> {
  const authFilePath = path.join(process.cwd(), AUTH_FILE_NAME);
  try {
    const data = await readFile(authFilePath, "utf8");
    return JSON.parse(data) as AuthFile;
  } catch (error) {
    return null;
  }
}

/**
 * Uses the access token to obtain a custom token for Firebase Auth
 * @param accessToken The access token obtained from the web dashboard
 */
export async function requestCustomToken(functions: Functions, accessToken: string): Promise<string | null> {
  const verifyAccessToken = httpsCallable(functions, 'verifyAccessToken');
  return await verifyAccessToken({ token: accessToken })
    .then((result) => {
      const data = result.data as { token: string }

      assert(data, "No data returned from verifyAccessToken");

      // Return the custom token
      return data.token;
    })
}

/**
 * Gets the auth file and authenticates the user with Firebase Auth
 * Returns the userUid if successful
 */
export async function getAuthAndAuthenticate(functions: Functions, auth: Auth): Promise<string | null> {
  const authObj: AuthFile | null = await getAuth();

  // Failure to retrieve auth file
  if (!authObj) {
    return null
  }

  // Retrieved auth file, so lets use the token
  const accessToken = authObj.accessToken;

  // Request a custom token using the access token
  const customToken = await requestCustomToken(functions, accessToken);

  // Failure to retrieve custom token
  if (!customToken) {
    return null;
  }

  // Sign in with the token
  const creds = await signInWithCustomToken(auth, customToken);

  // Deserialize the token to get the user UID
  const idTokenResult = await creds.user.getIdTokenResult();
  const userUid = idTokenResult.claims.userUid as string;

  return userUid;
}