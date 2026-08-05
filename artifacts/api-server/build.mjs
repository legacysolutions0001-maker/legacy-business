import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, cp, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // ─── External packages ────────────────────────────────────────────────────
    // firebase-admin and its entire ecosystem (@google-cloud/firestore,
    // @grpc/grpc-js, @grpc/proto-loader, protobufjs, google-auth-library,
    // google-gax, @opentelemetry/api …) are kept EXTERNAL here.
    //
    // WHY NOT BUNDLED: @google-cloud/firestore emits top-level CJS require()
    // calls for protobufjs, @grpc/grpc-js, @grpc/proto-loader, google-gax, etc.
    // inside its compiled .js files. esbuild cannot statically resolve dynamic
    // CJS require() calls — they pass through as external references in the
    // bundle. Bundling firebase-admin while leaving protobufjs/grpc external
    // produces a 6 MB dist/index.mjs that still crashes immediately in the
    // packaged EXE with:
    //
    //   Error: Cannot find module 'protobufjs'
    //   Require stack: - resources/api-server/dist/index.mjs
    //
    // FIX: keep the entire firebase ecosystem external, then install it as real
    // node_modules inside dist/ (see bottom of this file). electron-builder's
    // extraResources copies dist/** verbatim (filter: ["**/*"]), so the installed
    // node_modules end up at resources/api-server/dist/node_modules/ inside the
    // packaged EXE — the first path Node.js searches when resolving requires.
    external: [
      "*.node",
      // ── Native / non-bundleable packages ─────────────────────────────────
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
      // ── Firebase / Google Cloud ecosystem (installed into dist/node_modules/) ─
      "firebase-admin",
      "firebase-admin/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "@grpc/*",
      "protobufjs",
      "protobufjs/*",
      "google-auth-library",
      "google-gax",
      "google-gax/*",
      "@opentelemetry/*",
      "supports-color",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] }),
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });

  // ── Copy migrations ────────────────────────────────────────────────────────
  // migrate.ts resolves candidates as path.resolve(__currentDir, "./migrations")
  const migrationsSource = path.resolve(artifactDir, "../../lib/db/migrations");
  const migrationsDest = path.resolve(distDir, "migrations");
  await cp(migrationsSource, migrationsDest, { recursive: true });
  console.log("✓ Migrations copied to dist/migrations/");

  // ── Install firebase-admin ecosystem into dist/node_modules/ ──────────────
  // The firebase-admin package tree uses dynamic CJS require() calls deep inside
  // @google-cloud/firestore (protobufjs, @grpc/grpc-js, @grpc/proto-loader,
  // google-gax, google-auth-library, @opentelemetry/api, supports-color) that
  // esbuild cannot inline statically. We install them as real node_modules
  // alongside the bundle so both `node dist/index.mjs` in development AND the
  // packaged Electron EXE can resolve them at runtime.
  //
  // electron-builder extraResources already copies dist/** verbatim via
  // filter: ["**/*"], so dist/node_modules/ will be present in the packaged EXE
  // at resources/api-server/dist/node_modules/ — Node.js checks that path first.
  const apiPkgJson = JSON.parse(
    await import("node:fs").then((m) =>
      m.promises.readFile(path.resolve(artifactDir, "package.json"), "utf8")
    )
  );
  const firebaseVersion = apiPkgJson.dependencies["firebase-admin"] ?? "^14.2.0";

  await writeFile(
    path.join(distDir, "package.json"),
    JSON.stringify(
      {
        name: "legacy-api-runtime",
        version: "1.0.0",
        private: true,
        dependencies: { "firebase-admin": firebaseVersion },
      },
      null,
      2
    )
  );

  console.log(`Installing firebase-admin${firebaseVersion} + all transitive deps into dist/node_modules/ ...`);
  execSync(
    "npm install --production --ignore-scripts --no-audit --no-fund --loglevel=warn",
    { cwd: distDir, stdio: "inherit" }
  );
  console.log("✓ firebase-admin runtime deps installed into dist/node_modules/");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
