import "dotenv/config";
import { buildApp } from "./app.js";
import { createDatabase } from "./db.js";

const db = createDatabase();
const app = buildApp(db);
const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Peace server listening on http://localhost:${port}`);
});

