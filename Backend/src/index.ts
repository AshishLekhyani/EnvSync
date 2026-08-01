import { createApp } from "./app";
import { env } from "./config/env";
import { getMasterKey } from "./modules/encryption/masterKey";
import { startExpiryScanner } from "./modules/notifications/expiryScanner";
import { startSecretPurgeScanner } from "./modules/secrets/secretPurge";

getMasterKey();

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`EnvSync API listening on port ${env.PORT}`);
});

if (env.NODE_ENV !== "test") {
  startExpiryScanner(6 * 60 * 60 * 1000);
  startSecretPurgeScanner(60 * 60 * 1000);
}
