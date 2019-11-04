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
    HttpMethod,
    ProjectOperationCredentials,
    logger,
} from "@atomist/automation-client";
import { isTokenCredentials } from "@atomist/automation-client/lib/operations/common/ProjectOperationCredentials";
import { AspectWithReportDetails } from "@atomist/sdm-pack-aspect";
import { sha256, FP } from "@atomist/sdm-pack-fingerprint";

interface Pipeline {
    detected: "West" | "East" | "Legacy" | "Modern" | "none";
}

function pipelineFingerprintOf(detected: Pipeline["detected"]): FP<Pipeline> {
    const data = { detected };
    return {
        type: "current-pipeline",
        name: "current-pipeline",
        abbreviation: "pl",
        version: "0.0.1",
        data,
        sha: sha256(JSON.stringify(data)),
    };
}

export const
    CurrentPipelineAspect: AspectWithReportDetails<Pipeline> = {
        name: "current-pipeline",
        displayName: "Pipeline",
        extract: async (p, pli) => {
            // Look for a file that indicates Modern pipeline
            if (await p.hasFile("deployment.yaml")) {
                return pipelineFingerprintOf("Modern");
            }
            // Look for a file that the Legacy and West pipelines use
            if (await p.hasFile("buildfile")) {
                const buildFileContent = await p.findFile("buildfile").then(f => f.getContent());
                if (buildFileContent.includes("Legacy Deploy Stuff")) {
                    return pipelineFingerprintOf("Legacy");
                }
                return pipelineFingerprintOf("West");
            }
            // Ask the East pipeline deployer for this repository
            if (!pli.configuration.http || !pli.configuration.http.client || !pli.configuration.http.client.factory) {
                logger.error("No HTTP client");
            } else {
                const url = `https://eastpipeline.yo/${p.id.owner}/${p.id.repo}/doesThisWork`;
                const client = pli.configuration.http.client.factory.create(url);
                try {
                    const data = (await client.exchange<any>(url, {
                        method: HttpMethod.Get,
                        headers: headers(pli),
                        retry: {
                            retries: 0,
                        },
                    })).body;
                    if (data.includes("found")) {
                        return pipelineFingerprintOf("East")
                    }
                } catch (e) {
                    logger.error("Couldn't check for East pipeline: " + e.stack)
                }
            }
            // default to none
            return pipelineFingerprintOf("none");
        },
        toDisplayableFingerprint: fp => fp.data.detected,
        toDisplayableFingerprintName: () => "Pipeline",
        details: {
            description: "Detect what pipeline a repository deploys with",
            shortName: "current-pipeline",
            displayName: "Current pipeline",
            unit: "pipeline",
            category: "Release",
            url: `fingerprint/current-pipeline/current-pipeline?byOrg=true&trim=false`,
            manage: true,
        } as any,
    };

export function headers(papi: { credentials: ProjectOperationCredentials }): any {
    if (!!papi.credentials && isTokenCredentials(papi.credentials)) {
        return { Authorization: `Bearer ${(papi.credentials).token}` };
    } else {
        return undefined;
    }
}
