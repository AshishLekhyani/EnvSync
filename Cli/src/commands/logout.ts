import { clearCredentials } from "../credentials";

export async function runLogout(): Promise<void> {
  clearCredentials();
  console.log("Logged out.");
}
