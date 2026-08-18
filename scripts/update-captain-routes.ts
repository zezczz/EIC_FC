import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src/app/api/captain");

const rules: Array<{ test: RegExp; perm: string }> = [
  { test: /users\/\[id\]\/(role|permissions)/, perm: "USERS_ROLES" },
  { test: /users/, perm: "USERS_REVIEW" },
  {
    test: /articles\/\[id\]\/(publish|unpublish|archive|pin|unpin)/,
    perm: "ARTICLES_PUBLISH",
  },
  { test: /articles/, perm: "ARTICLES_WRITE" },
  { test: /relays/, perm: "RELAYS_WRITE" },
  { test: /audit/, perm: "AUDIT_READ" },
  { test: /media/, perm: "MEDIA_UPLOAD" },
];

function permissionFor(filePath: string) {
  const normalized = filePath.replace(/\\/g, "/");
  for (const rule of rules) {
    if (rule.test.test(normalized)) return rule.perm;
  }
  return "RELAYS_WRITE";
}

function walk(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === "route.ts") {
      let content = readFileSync(full, "utf8");
      if (!content.includes("requireCaptain")) continue;
      const perm = permissionFor(full);
      content = content.replace(
        /import \{ requireCaptain \} from "@\/server\/auth\/guards";/g,
        'import { requirePermission } from "@/server/auth/guards";\nimport { PERMISSIONS } from "@/server/auth/permissions";',
      );
      content = content.replace(
        /await requireCaptain\(\)/g,
        `await requirePermission(PERMISSIONS.${perm})`,
      );
      content = content.replace(
        /const captain = await requireCaptain\(\)/g,
        `const captain = await requirePermission(PERMISSIONS.${perm})`,
      );
      writeFileSync(full, content);
      console.log("updated", full, perm);
    }
  }
}

walk(root);
