/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from "power-assert";
import { InMemoryProject, Project } from "@atomist/automation-client";
import { NpmScripts, ScriptsFingerprintData } from "../lib/npmScripts";
import { FP } from "@atomist/sdm-pack-fingerprint";

async function methodUnderTest(p: Project): Promise<Array<FP<ScriptsFingerprintData>>> {
    return toArray(await NpmScripts.extract(p, {} as any));
}

describe("npm scripts aspect", () => {
    it("categorizes an aspect-sdm", async () => {
        const packageJson = {
            dependencies: {
                "@atomist/sdm-pack-aspect": "whatever",
                "@atomist/sdm": "yeah",
            },
            scripts: {
                "something": "do stuff"
            }
        }
        const p = projectWith(packageJson);
        const result = await methodUnderTest(p);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name.endsWith("aspect-sdm"), true, "Name was: " + result[0].name)
    });

    it("has the same SHA for the same scripts", async () => {
        const packageJson1 = {
            dependencies: {
                "@atomist/sdm-pack-aspect": "whatever",
                "@atomist/sdm": "yeah",
            },
            scripts: {
                "stuff": "yes",
                "things": "no"
            }
        };
        const packageJson2 = { ...packageJson1, dependencies: { ...packageJson1.dependencies, "more": "here" }, name: "different" };

        const result1 = await methodUnderTest(projectWith(packageJson1));
        const result2 = await methodUnderTest(projectWith(packageJson2));
        assert.strictEqual(result1[0].sha, result2[0].sha);
    })

    it("has different SHA for different scripts", async () => {
        const packageJson1 = {
            dependencies: {
                "@atomist/sdm-pack-aspect": "whatever",
                "@atomist/sdm": "yeah",
            },
            scripts: {
                "stuff": "yes",
                "things": "no"
            }
        };
        const packageJson2 = { ...packageJson1, scripts: { ...packageJson1.scripts, "more": "here" } };

        const result1 = await methodUnderTest(projectWith(packageJson1));
        const result2 = await methodUnderTest(projectWith(packageJson2));
        assert.notEqual(result1[0].sha, result2[0].sha);
    })
});

function projectWith(packageJson: {}) {
    return InMemoryProject.of({ path: "package.json", content: JSON.stringify(packageJson, null, 2) })
}

function toArray<T>(something: T | Array<T>): Array<T> {
    if (Array.isArray(something)) {
        return something;
    }
    return [something];
}