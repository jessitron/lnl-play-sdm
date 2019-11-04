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
import { NpmScripts, NpmScriptsFingerprintData, fingerprintNameFromCategory } from "../lib/npmScripts";
import { FP } from "@atomist/sdm-pack-fingerprint";

async function getNpmScriptsFingerprints(p: Project): Promise<Array<FP<NpmScriptsFingerprintData>>> {
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
        const result = await getNpmScriptsFingerprints(p);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, fingerprintNameFromCategory("aspect-sdm"), "Name was: " + result[0].name)
    });

    it("categorizes an sdm", async () => {
        const packageJson = {
            dependencies: {
                "@atomist/sdm-pack-somethingelse": "whatever",
                "@atomist/sdm": "yeah",
            },
            scripts: {
                "something": "do stuff"
            }
        }
        const p = projectWith(packageJson);
        const result = await getNpmScriptsFingerprints(p);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, fingerprintNameFromCategory("sdm"), "Name was: " + result[0].name)
    });

    it("does not a produce a fingerprint for non-sdms", async () => {
        const packageJson = {
            dependencies: {
                "something": "orother",
            },
            scripts: {
                "something": "do stuff"
            }
        }
        const p = projectWith(packageJson);
        const result = await getNpmScriptsFingerprints(p);
        assert.strictEqual(result.length, 0);
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

        const result1 = await getNpmScriptsFingerprints(projectWith(packageJson1));
        const result2 = await getNpmScriptsFingerprints(projectWith(packageJson2));
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

        const result1 = await getNpmScriptsFingerprints(projectWith(packageJson1));
        const result2 = await getNpmScriptsFingerprints(projectWith(packageJson2));
        assert.notEqual(result1[0].sha, result2[0].sha);
    })
});

describe("applying the npm scripts aspect", () => {
    it("Puts the target scripts in a project with different scripts", async () => {
        const happyScripts = {
            "stuff": "yes",
            "things": "no"
        }
        const happyPackageJson = {
            name: "happy",
            dependencies: {
                "@atomist/sdm-pack-aspect": "whatever",
                "@atomist/sdm": "yeah",
            },
            scripts: happyScripts
        };

        const sadPackageJson = {
            name: "unhappy",
            dependencies: {
                "@atomist/sdm-pack-aspect": "whatever",
                "@atomist/sdm": "yeah",
            },
            scripts: {
                "anything": "other than happy scripts"
            }
        }

        const targetFingerprint = (await getNpmScriptsFingerprints(projectWith(happyPackageJson)))[0];

        const methodUnderTest = NpmScripts.apply;
        if (!methodUnderTest) {
            assert.fail("the wolrd is terrible");
            return;
        }

        const result = await methodUnderTest(projectWith(sadPackageJson), { parameters: { fp: targetFingerprint } } as any);

        const jsonContent = (result as Project).findFileSync("package.json").getContentSync()

        const json = JSON.parse(jsonContent);
        assert.deepStrictEqual(json.scripts, happyScripts);
        assert.strictEqual(json.name, "unhappy", "Name should not have changed");

    });
})

function projectWith(packageJson: {}) {
    return InMemoryProject.of({ path: "package.json", content: JSON.stringify(packageJson, null, 2) })
}

function toArray<T>(something: T | Array<T>): Array<T> {
    if (Array.isArray(something)) {
        return something;
    }
    return [something];
}