import chalk from "chalk";
import { parseJSON } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as Path from "path";

import { onLeft, onRight, readFile, writeFile } from "./common";

const esmJSON = JSON.stringify({ type: "module" });
const shakeJSON = JSON.stringify({ module: "./index.js" });
const cjsJSON = JSON.stringify({ type: "commonjs" });

pipe(
   readFile(Path.resolve(process.cwd(), "package.json"), "utf8"),
   TE.chain((content) =>
      TE.fromEither(parseJSON(content, (err) => new Error(`json parse error: ${(err as Error).message}`)))
   ),
   TE.chain((content: any) =>
      writeFile(
         Path.resolve(process.cwd(), "dist/package.json"),
         JSON.stringify({
            author: content["author"],
            dependencies: content["dependencies"],
            description: content["description"],
            sideEffects: false,
            exports: {
               ".": {
                  import: "./dist/esm-fix/index.js",
                  require: "./dist/cjs/index.js"
               },
               "./": {
                  import: "./dist/esm-fix/",
                  require: "./dist/cjs/"
               }
            },
            license: content["license"],
            main: "./dist/cjs/index.js",
            name: content["name"],
            peerDependencies: content["peerDependencies"],
            private: false,
            publishConfig: {
               access: "public"
            },
            repository: content["repository"],
            module: "./dist/esm-shake/index.js",
            typings: "./index.d.ts",
            version: content["version"]
         })
      )
   ),
   TE.chain(() => writeFile(Path.resolve(process.cwd(), "dist/dist/cjs/package.json"), cjsJSON)),
   TE.chain(() => writeFile(Path.resolve(process.cwd(), "dist/dist/esm-shake/package.json"), shakeJSON)),
   TE.chain(() => writeFile(Path.resolve(process.cwd(), "dist/dist/esm-fix/package.json"), esmJSON)),
   TE.fold(onLeft, onRight("Package copy succeeded!"))
)().catch((e) => console.log(chalk.red.bold(`unexpected error ${e}`)));
