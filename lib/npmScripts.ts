/*
 * Copyright © 2019 Atomist, Inc.
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

import {
    logger,
} from "@atomist/automation-client";
import { AspectWithReportDetails } from "@atomist/sdm-pack-aspect";
import { sha256, FP } from "@atomist/sdm-pack-fingerprint";

interface ScriptsFingerprintData {
    scripts: Record<string, string>,
    link: string,
}

function scriptFingerprintOf(category: "aspect-sdm" | "sdm",
    scripts: Record<string, string>,
    link: string): FP<ScriptsFingerprintData> {
    return {
        type: "npm-scripts",
        name: "npm-scripts-" + category,
        data: { scripts, link },
        sha: sha256(JSON.stringify(scripts)),
        abbreviation: "npmscr",
        version: "0.0.1",
    }
}

/**
 * Keep the package.json `scripts` list consistent for some categories of projects.
 * These categories include:
 * 
 * - Aspect SDMs (include the aspect pack)
 * - Other SDMs
 * 
 * Each category gets its own fingerprint.
 * The fingerprint data contains the `scripts` and a link to the file on GitHub.
 * Only the `scripts` affect the fingerprint SHA; only the link is displayed.
 */
export const
    NpmScripts: AspectWithReportDetails<ScriptsFingerprintData> = {
        name: "npm-scripts",
        displayName: "npm scripts",
        extract: async (p, pli) => {
            return [];
        },
        apply: async (p, papi) => {
            if (!papi.parameters || !papi.parameters.fp) {
                logger.error("No parameters");
                return p;
            }
            const fp = papi.parameters.fp;
            return p;
        },
        toDisplayableFingerprint: fp => fp.data.link,
        toDisplayableFingerprintName: (fpname) => "NPM Scripts for " + fpname.replace("npm-scripts-", ""),
        details: {
            description: "NPM Scripts",
            shortName: "npm-scripts",
            displayName: "NPM Scripts",
            unit: "scripts",
            category: "npm",
            url: `fingerprint/npm-scripts/*?byOrg=true&trim=false`,
            manage: true,
        } as any,
    };
