import { app } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

async function start() {
  try {
    await connectDatabase();
    app.listen(env.port, () => {
      console.log(`Server http://localhost:${env.port} manzilida ishlayapti.`);
    });
  } catch (error) {
    console.error("Serverni ishga tushirib bo‘lmadi:", error.message);
    process.exit(1);
  }
}

start();

