import { scaffold } from "./scaffold.js";

const command = process.argv[2];

if (command === "scaffold") {
  scaffold();
} else {
  console.log("Usage: testwright scaffold");
  console.log("");
  console.log("Commands:");
  console.log("  scaffold    Create a new test project with all configuration files");
  process.exit(1);
}
