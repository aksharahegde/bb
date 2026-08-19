// Portable type declarations for `@get-bb/plugin-sdk`. Unpublished BB
// workspace contracts are flattened; public subpaths may reuse the
// package root without requiring any other @bb/* package.
//
// Confused by the API, or need a symbol that isn't here? Clone the BB repo
// and read the real source: https://github.com/get-bb/bb

import { z } from 'zod';
import { BbPluginApi, PluginSettingValue, PluginSharedPortTunnelIdentity, PluginAgentToolExperimentalStatusLabels, PluginAgentToolContext, PluginAgentToolResult, PluginCliCommandInfo, PluginCliContext, PluginCliResult, PluginHttpAuthMode, PluginHttpHandler, PluginMentionTrigger, PluginMentionSearchContext, PluginMentionItem, JsonValue as JsonValue$1, PluginCliExecutionResult, PluginThreadEventName, PluginThreadEventPayloads, PluginAgentConfigurationContext, PluginSettingDescriptors, PluginAgentConfiguration, PluginProviderDeclaration, PluginInteractionRequest } from '@get-bb/plugin-sdk';

interface JsonObject {
    [key: string]: JsonValue;
}
type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;

type HostDaemonCommandTransport = "onlineRpc" | "settled";
type HostDaemonCommandEnvironmentLane = "read" | "write";
type HostDaemonFlushEventsBeforeResult = boolean | "when-initiated";
interface HostDaemonCommandDescriptor<Type extends string, Schema extends z.ZodTypeAny, ResultSchema extends z.ZodTypeAny, Transport extends HostDaemonCommandTransport, Retryable extends boolean> {
    type: Type;
    schema: Schema;
    resultSchema: ResultSchema;
    transport: Transport;
    retryable: Retryable;
    flushEventsBeforeResult: HostDaemonFlushEventsBeforeResult;
    envLane: HostDaemonCommandEnvironmentLane | null;
}
declare const hostDaemonCommandRegistry: {
    "thread.rewind.discard": HostDaemonCommandDescriptor<"thread.rewind.discard", z.ZodObject<{
        environmentId: z.ZodString;
        leaseId: z.ZodString;
        threadId: z.ZodString;
        type: z.ZodLiteral<"thread.rewind.discard">;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strip>, "settled", false>;
    "thread.rewind.prepare": HostDaemonCommandDescriptor<"thread.rewind.prepare", z.ZodObject<{
        acpLaunchSpec: z.ZodOptional<z.ZodObject<{
            args: z.ZodArray<z.ZodString>;
            command: z.ZodString;
            cwd: z.ZodOptional<z.ZodString>;
            displayName: z.ZodString;
            env: z.ZodRecord<z.ZodString, z.ZodString>;
            modelCli: z.ZodOptional<z.ZodPipe<z.ZodObject<{
                listArgs: z.ZodArray<z.ZodString>;
                primaryModels: z.ZodArray<z.ZodString>;
                selectFlag: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodTransform<{
                listArgs: string[];
                primaryModels: string[];
                selectFlag?: string | undefined;
            } | undefined, {
                listArgs: string[];
                primaryModels: string[];
                selectFlag?: string | undefined;
            }>>>;
            nativeReasoning: z.ZodOptional<z.ZodObject<{
                configId: z.ZodString;
                defaultLevel: z.ZodOptional<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
                levelValues: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }> & z.core.$partial, z.ZodString>>;
                supportedLevels: z.ZodArray<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
            }, z.core.$strict>>;
            nativeSkillRoots: z.ZodOptional<z.ZodObject<{
                project: z.ZodDefault<z.ZodArray<z.ZodString>>;
                user: z.ZodDefault<z.ZodArray<z.ZodString>>;
            }, z.core.$strict>>;
            permissionCli: z.ZodOptional<z.ZodObject<{
                full: z.ZodOptional<z.ZodArray<z.ZodString>>;
                insertAfterArgs: z.ZodOptional<z.ZodNumber>;
                readonly: z.ZodOptional<z.ZodArray<z.ZodString>>;
                workspaceWrite: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strict>>;
            reasoningCli: z.ZodOptional<z.ZodObject<{
                defaultLevel: z.ZodOptional<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
                flag: z.ZodString;
                levelValues: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }> & z.core.$partial, z.ZodString>>;
                supportedLevels: z.ZodArray<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        bridgeLaunch: z.ZodObject<{
            capabilities: z.ZodObject<{
                fork: z.ZodEnum<{
                    checkpoint: "checkpoint";
                    none: "none";
                    tip: "tip";
                }>;
                permissionModes: z.ZodArray<z.ZodEnum<{
                    "accept-edits": "accept-edits";
                    auto: "auto";
                    full: "full";
                }>>;
                supportsServiceTier: z.ZodBoolean;
                supportsThreadArchive: z.ZodBoolean;
                supportsThreadRename: z.ZodBoolean;
            }, z.core.$strict>;
            pluginId: z.ZodString;
            source: z.ZodDiscriminatedUnion<[z.ZodObject<{
                byteLength: z.ZodNumber;
                digest: z.ZodString;
                kind: z.ZodLiteral<"artifact">;
            }, z.core.$strict>, z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodLiteral<"daemon-bundled">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>;
        disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
        dynamicTools: z.ZodArray<z.ZodObject<{
            description: z.ZodString;
            inputSchema: z.ZodUnknown;
            name: z.ZodString;
        }, z.core.$strip>>;
        environmentId: z.ZodString;
        externalMcpServers: z.ZodArray<z.ZodObject<{
            args: z.ZodOptional<z.ZodArray<z.ZodString>>;
            command: z.ZodOptional<z.ZodString>;
            env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            envFromHost: z.ZodOptional<z.ZodArray<z.ZodString>>;
            name: z.ZodString;
            transport: z.ZodEnum<{
                http: "http";
                sse: "sse";
                stdio: "stdio";
            }>;
            url: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        injectedSkillSources: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            description: z.ZodString;
            entryPath: z.ZodString;
            kind: z.ZodLiteral<"tree">;
            name: z.ZodString;
            sourceType: z.ZodEnum<{
                "data-dir": "data-dir";
                builtin: "builtin";
            }>;
            treeHash: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            description: z.ZodString;
            kind: z.ZodLiteral<"workspace-path">;
            name: z.ZodString;
            skillFilePath: z.ZodString;
            sourceRootPath: z.ZodString;
            sourceType: z.ZodLiteral<"project">;
        }, z.core.$strict>, z.ZodObject<{
            description: z.ZodString;
            kind: z.ZodLiteral<"host-path">;
            name: z.ZodString;
            skillFilePath: z.ZodString;
            sourceRootPath: z.ZodString;
            sourceType: z.ZodEnum<{
                "shared-project": "shared-project";
                "shared-user": "shared-user";
            }>;
        }, z.core.$strict>], "kind">>;
        instructionMode: z.ZodEnum<{
            append: "append";
            replace: "replace";
        }>;
        instructions: z.ZodString;
        leaseId: z.ZodString;
        options: z.ZodIntersection<z.ZodObject<{
            claudeCodeMockCliTraffic: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodBoolean;
                endpoint: z.ZodString;
            }, z.core.$strict>>;
            claudeCodePermissionMode: z.ZodOptional<z.ZodLiteral<"plan">>;
            memoryEnabled: z.ZodOptional<z.ZodBoolean>;
            model: z.ZodString;
            providerSubagentsEnabled: z.ZodOptional<z.ZodBoolean>;
            reasoningLevel: z.ZodEnum<{
                high: "high";
                low: "low";
                max: "max";
                medium: "medium";
                none: "none";
                ultra: "ultra";
                ultracode: "ultracode";
                xhigh: "xhigh";
            }>;
            serviceTier: z.ZodEnum<{
                default: "default";
                fast: "fast";
            }>;
            workflowsEnabled: z.ZodBoolean;
        }, z.core.$strip>, z.ZodDiscriminatedUnion<[z.ZodObject<{
            approvalReviewer: z.ZodLiteral<"user">;
            permissionEscalation: z.ZodEnum<{
                ask: "ask";
                deny: "deny";
            }>;
            permissionMode: z.ZodLiteral<"accept-edits">;
            permissionScope: z.ZodLiteral<"workspace">;
        }, z.core.$strip>, z.ZodObject<{
            approvalReviewer: z.ZodLiteral<"automatic">;
            permissionEscalation: z.ZodEnum<{
                ask: "ask";
                deny: "deny";
            }>;
            permissionMode: z.ZodLiteral<"auto">;
            permissionScope: z.ZodLiteral<"workspace">;
        }, z.core.$strip>, z.ZodObject<{
            approvalReviewer: z.ZodNull;
            permissionEscalation: z.ZodNull;
            permissionMode: z.ZodLiteral<"full">;
            permissionScope: z.ZodLiteral<"full">;
        }, z.core.$strip>], "permissionMode">>;
        projectId: z.ZodString;
        providerId: z.ZodString;
        retainThroughProviderCheckpoint: z.ZodString;
        sourceProviderThreadId: z.ZodString;
        threadId: z.ZodString;
        type: z.ZodLiteral<"thread.rewind.prepare">;
        workspaceContext: z.ZodObject<{
            workspacePath: z.ZodString;
            workspaceProvisionType: z.ZodEnum<{
                "managed-worktree": "managed-worktree";
                personal: "personal";
                unmanaged: "unmanaged";
            }>;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodObject<{
        providerThreadId: z.ZodString;
    }, z.core.$strip>, "settled", false>;
    "thread.start": HostDaemonCommandDescriptor<"thread.start", z.ZodObject<{
        acpLaunchSpec: z.ZodOptional<z.ZodObject<{
            args: z.ZodArray<z.ZodString>;
            command: z.ZodString;
            cwd: z.ZodOptional<z.ZodString>;
            displayName: z.ZodString;
            env: z.ZodRecord<z.ZodString, z.ZodString>;
            modelCli: z.ZodOptional<z.ZodPipe<z.ZodObject<{
                listArgs: z.ZodArray<z.ZodString>;
                primaryModels: z.ZodArray<z.ZodString>;
                selectFlag: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodTransform<{
                listArgs: string[];
                primaryModels: string[];
                selectFlag?: string | undefined;
            } | undefined, {
                listArgs: string[];
                primaryModels: string[];
                selectFlag?: string | undefined;
            }>>>;
            nativeReasoning: z.ZodOptional<z.ZodObject<{
                configId: z.ZodString;
                defaultLevel: z.ZodOptional<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
                levelValues: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }> & z.core.$partial, z.ZodString>>;
                supportedLevels: z.ZodArray<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
            }, z.core.$strict>>;
            nativeSkillRoots: z.ZodOptional<z.ZodObject<{
                project: z.ZodDefault<z.ZodArray<z.ZodString>>;
                user: z.ZodDefault<z.ZodArray<z.ZodString>>;
            }, z.core.$strict>>;
            permissionCli: z.ZodOptional<z.ZodObject<{
                full: z.ZodOptional<z.ZodArray<z.ZodString>>;
                insertAfterArgs: z.ZodOptional<z.ZodNumber>;
                readonly: z.ZodOptional<z.ZodArray<z.ZodString>>;
                workspaceWrite: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strict>>;
            reasoningCli: z.ZodOptional<z.ZodObject<{
                defaultLevel: z.ZodOptional<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
                flag: z.ZodString;
                levelValues: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }> & z.core.$partial, z.ZodString>>;
                supportedLevels: z.ZodArray<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        bridgeLaunch: z.ZodObject<{
            capabilities: z.ZodObject<{
                fork: z.ZodEnum<{
                    checkpoint: "checkpoint";
                    none: "none";
                    tip: "tip";
                }>;
                permissionModes: z.ZodArray<z.ZodEnum<{
                    "accept-edits": "accept-edits";
                    auto: "auto";
                    full: "full";
                }>>;
                supportsServiceTier: z.ZodBoolean;
                supportsThreadArchive: z.ZodBoolean;
                supportsThreadRename: z.ZodBoolean;
            }, z.core.$strict>;
            pluginId: z.ZodString;
            source: z.ZodDiscriminatedUnion<[z.ZodObject<{
                byteLength: z.ZodNumber;
                digest: z.ZodString;
                kind: z.ZodLiteral<"artifact">;
            }, z.core.$strict>, z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodLiteral<"daemon-bundled">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>;
        disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
        dynamicTools: z.ZodArray<z.ZodObject<{
            description: z.ZodString;
            inputSchema: z.ZodUnknown;
            name: z.ZodString;
        }, z.core.$strip>>;
        environmentId: z.ZodString;
        externalMcpServers: z.ZodArray<z.ZodObject<{
            args: z.ZodOptional<z.ZodArray<z.ZodString>>;
            command: z.ZodOptional<z.ZodString>;
            env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            envFromHost: z.ZodOptional<z.ZodArray<z.ZodString>>;
            name: z.ZodString;
            transport: z.ZodEnum<{
                http: "http";
                sse: "sse";
                stdio: "stdio";
            }>;
            url: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        fork: z.ZodOptional<z.ZodObject<{
            sourceProviderThreadId: z.ZodString;
        }, z.core.$strip>>;
        injectedSkillSources: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            description: z.ZodString;
            entryPath: z.ZodString;
            kind: z.ZodLiteral<"tree">;
            name: z.ZodString;
            sourceType: z.ZodEnum<{
                "data-dir": "data-dir";
                builtin: "builtin";
            }>;
            treeHash: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            description: z.ZodString;
            kind: z.ZodLiteral<"workspace-path">;
            name: z.ZodString;
            skillFilePath: z.ZodString;
            sourceRootPath: z.ZodString;
            sourceType: z.ZodLiteral<"project">;
        }, z.core.$strict>, z.ZodObject<{
            description: z.ZodString;
            kind: z.ZodLiteral<"host-path">;
            name: z.ZodString;
            skillFilePath: z.ZodString;
            sourceRootPath: z.ZodString;
            sourceType: z.ZodEnum<{
                "shared-project": "shared-project";
                "shared-user": "shared-user";
            }>;
        }, z.core.$strict>], "kind">>;
        input: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            mentions: z.ZodDefault<z.ZodArray<z.ZodObject<{
                end: z.ZodNumber;
                resource: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodDiscriminatedUnion<[z.ZodObject<{
                    kind: z.ZodLiteral<"thread">;
                    label: z.ZodString;
                    projectId: z.ZodOptional<z.ZodString>;
                    threadId: z.ZodString;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"project">;
                    label: z.ZodString;
                    projectId: z.ZodString;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"section">;
                    label: z.ZodString;
                    sectionId: z.ZodString;
                }, z.core.$strip>, z.ZodObject<{
                    entryKind: z.ZodEnum<{
                        directory: "directory";
                        file: "file";
                    }>;
                    kind: z.ZodLiteral<"path">;
                    label: z.ZodString;
                    path: z.ZodString;
                    source: z.ZodEnum<{
                        "thread-storage": "thread-storage";
                        workspace: "workspace";
                    }>;
                }, z.core.$strip>, z.ZodObject<{
                    argumentHint: z.ZodNullable<z.ZodString>;
                    kind: z.ZodLiteral<"command">;
                    label: z.ZodString;
                    name: z.ZodString;
                    origin: z.ZodEnum<{
                        builtin: "builtin";
                        project: "project";
                        user: "user";
                    }>;
                    source: z.ZodEnum<{
                        command: "command";
                        skill: "skill";
                    }>;
                    trigger: z.ZodEnum<{
                        "/": "/";
                    }>;
                }, z.core.$strip>, z.ZodObject<{
                    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    itemId: z.ZodString;
                    kind: z.ZodLiteral<"plugin">;
                    label: z.ZodString;
                    pluginId: z.ZodString;
                }, z.core.$strip>], "kind">>;
                start: z.ZodNumber;
            }, z.core.$strip>>>;
            text: z.ZodString;
            type: z.ZodLiteral<"text">;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
            url: z.ZodString;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>, z.ZodObject<{
            path: z.ZodString;
            type: z.ZodLiteral<"localImage">;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>, z.ZodObject<{
            mimeType: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            path: z.ZodString;
            sizeBytes: z.ZodOptional<z.ZodNumber>;
            type: z.ZodLiteral<"localFile">;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>], "type">>;
        inputGroups: z.ZodOptional<z.ZodArray<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            mentions: z.ZodDefault<z.ZodArray<z.ZodObject<{
                end: z.ZodNumber;
                resource: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodDiscriminatedUnion<[z.ZodObject<{
                    kind: z.ZodLiteral<"thread">;
                    label: z.ZodString;
                    projectId: z.ZodOptional<z.ZodString>;
                    threadId: z.ZodString;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"project">;
                    label: z.ZodString;
                    projectId: z.ZodString;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"section">;
                    label: z.ZodString;
                    sectionId: z.ZodString;
                }, z.core.$strip>, z.ZodObject<{
                    entryKind: z.ZodEnum<{
                        directory: "directory";
                        file: "file";
                    }>;
                    kind: z.ZodLiteral<"path">;
                    label: z.ZodString;
                    path: z.ZodString;
                    source: z.ZodEnum<{
                        "thread-storage": "thread-storage";
                        workspace: "workspace";
                    }>;
                }, z.core.$strip>, z.ZodObject<{
                    argumentHint: z.ZodNullable<z.ZodString>;
                    kind: z.ZodLiteral<"command">;
                    label: z.ZodString;
                    name: z.ZodString;
                    origin: z.ZodEnum<{
                        builtin: "builtin";
                        project: "project";
                        user: "user";
                    }>;
                    source: z.ZodEnum<{
                        command: "command";
                        skill: "skill";
                    }>;
                    trigger: z.ZodEnum<{
                        "/": "/";
                    }>;
                }, z.core.$strip>, z.ZodObject<{
                    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    itemId: z.ZodString;
                    kind: z.ZodLiteral<"plugin">;
                    label: z.ZodString;
                    pluginId: z.ZodString;
                }, z.core.$strip>], "kind">>;
                start: z.ZodNumber;
            }, z.core.$strip>>>;
            text: z.ZodString;
            type: z.ZodLiteral<"text">;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
            url: z.ZodString;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>, z.ZodObject<{
            path: z.ZodString;
            type: z.ZodLiteral<"localImage">;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>, z.ZodObject<{
            mimeType: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            path: z.ZodString;
            sizeBytes: z.ZodOptional<z.ZodNumber>;
            type: z.ZodLiteral<"localFile">;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>], "type">>>>;
        instructionMode: z.ZodEnum<{
            append: "append";
            replace: "replace";
        }>;
        instructions: z.ZodString;
        options: z.ZodIntersection<z.ZodObject<{
            claudeCodeMockCliTraffic: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodBoolean;
                endpoint: z.ZodString;
            }, z.core.$strict>>;
            claudeCodePermissionMode: z.ZodOptional<z.ZodLiteral<"plan">>;
            memoryEnabled: z.ZodOptional<z.ZodBoolean>;
            model: z.ZodString;
            providerSubagentsEnabled: z.ZodOptional<z.ZodBoolean>;
            reasoningLevel: z.ZodEnum<{
                high: "high";
                low: "low";
                max: "max";
                medium: "medium";
                none: "none";
                ultra: "ultra";
                ultracode: "ultracode";
                xhigh: "xhigh";
            }>;
            serviceTier: z.ZodEnum<{
                default: "default";
                fast: "fast";
            }>;
            workflowsEnabled: z.ZodBoolean;
        }, z.core.$strip>, z.ZodDiscriminatedUnion<[z.ZodObject<{
            approvalReviewer: z.ZodLiteral<"user">;
            permissionEscalation: z.ZodEnum<{
                ask: "ask";
                deny: "deny";
            }>;
            permissionMode: z.ZodLiteral<"accept-edits">;
            permissionScope: z.ZodLiteral<"workspace">;
        }, z.core.$strip>, z.ZodObject<{
            approvalReviewer: z.ZodLiteral<"automatic">;
            permissionEscalation: z.ZodEnum<{
                ask: "ask";
                deny: "deny";
            }>;
            permissionMode: z.ZodLiteral<"auto">;
            permissionScope: z.ZodLiteral<"workspace">;
        }, z.core.$strip>, z.ZodObject<{
            approvalReviewer: z.ZodNull;
            permissionEscalation: z.ZodNull;
            permissionMode: z.ZodLiteral<"full">;
            permissionScope: z.ZodLiteral<"full">;
        }, z.core.$strip>], "permissionMode">>;
        projectId: z.ZodString;
        providerId: z.ZodString;
        requestId: z.ZodString;
        threadId: z.ZodString;
        threadStoragePath: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"thread.start">;
        workspaceContext: z.ZodObject<{
            workspacePath: z.ZodString;
            workspaceProvisionType: z.ZodEnum<{
                "managed-worktree": "managed-worktree";
                personal: "personal";
                unmanaged: "unmanaged";
            }>;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodObject<{
        providerThreadId: z.ZodString;
    }, z.core.$strip>, "settled", false>;
    "turn.submit": HostDaemonCommandDescriptor<"turn.submit", z.ZodObject<{
        acpLaunchSpec: z.ZodOptional<z.ZodObject<{
            args: z.ZodArray<z.ZodString>;
            command: z.ZodString;
            cwd: z.ZodOptional<z.ZodString>;
            displayName: z.ZodString;
            env: z.ZodRecord<z.ZodString, z.ZodString>;
            modelCli: z.ZodOptional<z.ZodPipe<z.ZodObject<{
                listArgs: z.ZodArray<z.ZodString>;
                primaryModels: z.ZodArray<z.ZodString>;
                selectFlag: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodTransform<{
                listArgs: string[];
                primaryModels: string[];
                selectFlag?: string | undefined;
            } | undefined, {
                listArgs: string[];
                primaryModels: string[];
                selectFlag?: string | undefined;
            }>>>;
            nativeReasoning: z.ZodOptional<z.ZodObject<{
                configId: z.ZodString;
                defaultLevel: z.ZodOptional<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
                levelValues: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }> & z.core.$partial, z.ZodString>>;
                supportedLevels: z.ZodArray<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
            }, z.core.$strict>>;
            nativeSkillRoots: z.ZodOptional<z.ZodObject<{
                project: z.ZodDefault<z.ZodArray<z.ZodString>>;
                user: z.ZodDefault<z.ZodArray<z.ZodString>>;
            }, z.core.$strict>>;
            permissionCli: z.ZodOptional<z.ZodObject<{
                full: z.ZodOptional<z.ZodArray<z.ZodString>>;
                insertAfterArgs: z.ZodOptional<z.ZodNumber>;
                readonly: z.ZodOptional<z.ZodArray<z.ZodString>>;
                workspaceWrite: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strict>>;
            reasoningCli: z.ZodOptional<z.ZodObject<{
                defaultLevel: z.ZodOptional<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
                flag: z.ZodString;
                levelValues: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }> & z.core.$partial, z.ZodString>>;
                supportedLevels: z.ZodArray<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        bridgeLaunch: z.ZodObject<{
            capabilities: z.ZodObject<{
                fork: z.ZodEnum<{
                    checkpoint: "checkpoint";
                    none: "none";
                    tip: "tip";
                }>;
                permissionModes: z.ZodArray<z.ZodEnum<{
                    "accept-edits": "accept-edits";
                    auto: "auto";
                    full: "full";
                }>>;
                supportsServiceTier: z.ZodBoolean;
                supportsThreadArchive: z.ZodBoolean;
                supportsThreadRename: z.ZodBoolean;
            }, z.core.$strict>;
            pluginId: z.ZodString;
            source: z.ZodDiscriminatedUnion<[z.ZodObject<{
                byteLength: z.ZodNumber;
                digest: z.ZodString;
                kind: z.ZodLiteral<"artifact">;
            }, z.core.$strict>, z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodLiteral<"daemon-bundled">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>;
        environmentId: z.ZodString;
        input: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            mentions: z.ZodDefault<z.ZodArray<z.ZodObject<{
                end: z.ZodNumber;
                resource: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodDiscriminatedUnion<[z.ZodObject<{
                    kind: z.ZodLiteral<"thread">;
                    label: z.ZodString;
                    projectId: z.ZodOptional<z.ZodString>;
                    threadId: z.ZodString;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"project">;
                    label: z.ZodString;
                    projectId: z.ZodString;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"section">;
                    label: z.ZodString;
                    sectionId: z.ZodString;
                }, z.core.$strip>, z.ZodObject<{
                    entryKind: z.ZodEnum<{
                        directory: "directory";
                        file: "file";
                    }>;
                    kind: z.ZodLiteral<"path">;
                    label: z.ZodString;
                    path: z.ZodString;
                    source: z.ZodEnum<{
                        "thread-storage": "thread-storage";
                        workspace: "workspace";
                    }>;
                }, z.core.$strip>, z.ZodObject<{
                    argumentHint: z.ZodNullable<z.ZodString>;
                    kind: z.ZodLiteral<"command">;
                    label: z.ZodString;
                    name: z.ZodString;
                    origin: z.ZodEnum<{
                        builtin: "builtin";
                        project: "project";
                        user: "user";
                    }>;
                    source: z.ZodEnum<{
                        command: "command";
                        skill: "skill";
                    }>;
                    trigger: z.ZodEnum<{
                        "/": "/";
                    }>;
                }, z.core.$strip>, z.ZodObject<{
                    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    itemId: z.ZodString;
                    kind: z.ZodLiteral<"plugin">;
                    label: z.ZodString;
                    pluginId: z.ZodString;
                }, z.core.$strip>], "kind">>;
                start: z.ZodNumber;
            }, z.core.$strip>>>;
            text: z.ZodString;
            type: z.ZodLiteral<"text">;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
            url: z.ZodString;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>, z.ZodObject<{
            path: z.ZodString;
            type: z.ZodLiteral<"localImage">;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>, z.ZodObject<{
            mimeType: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            path: z.ZodString;
            sizeBytes: z.ZodOptional<z.ZodNumber>;
            type: z.ZodLiteral<"localFile">;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>], "type">>;
        inputGroups: z.ZodOptional<z.ZodArray<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            mentions: z.ZodDefault<z.ZodArray<z.ZodObject<{
                end: z.ZodNumber;
                resource: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodDiscriminatedUnion<[z.ZodObject<{
                    kind: z.ZodLiteral<"thread">;
                    label: z.ZodString;
                    projectId: z.ZodOptional<z.ZodString>;
                    threadId: z.ZodString;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"project">;
                    label: z.ZodString;
                    projectId: z.ZodString;
                }, z.core.$strip>, z.ZodObject<{
                    kind: z.ZodLiteral<"section">;
                    label: z.ZodString;
                    sectionId: z.ZodString;
                }, z.core.$strip>, z.ZodObject<{
                    entryKind: z.ZodEnum<{
                        directory: "directory";
                        file: "file";
                    }>;
                    kind: z.ZodLiteral<"path">;
                    label: z.ZodString;
                    path: z.ZodString;
                    source: z.ZodEnum<{
                        "thread-storage": "thread-storage";
                        workspace: "workspace";
                    }>;
                }, z.core.$strip>, z.ZodObject<{
                    argumentHint: z.ZodNullable<z.ZodString>;
                    kind: z.ZodLiteral<"command">;
                    label: z.ZodString;
                    name: z.ZodString;
                    origin: z.ZodEnum<{
                        builtin: "builtin";
                        project: "project";
                        user: "user";
                    }>;
                    source: z.ZodEnum<{
                        command: "command";
                        skill: "skill";
                    }>;
                    trigger: z.ZodEnum<{
                        "/": "/";
                    }>;
                }, z.core.$strip>, z.ZodObject<{
                    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    itemId: z.ZodString;
                    kind: z.ZodLiteral<"plugin">;
                    label: z.ZodString;
                    pluginId: z.ZodString;
                }, z.core.$strip>], "kind">>;
                start: z.ZodNumber;
            }, z.core.$strip>>>;
            text: z.ZodString;
            type: z.ZodLiteral<"text">;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
            url: z.ZodString;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>, z.ZodObject<{
            path: z.ZodString;
            type: z.ZodLiteral<"localImage">;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>, z.ZodObject<{
            mimeType: z.ZodOptional<z.ZodString>;
            name: z.ZodOptional<z.ZodString>;
            path: z.ZodString;
            sizeBytes: z.ZodOptional<z.ZodNumber>;
            type: z.ZodLiteral<"localFile">;
            visibility: z.ZodOptional<z.ZodEnum<{
                "agent-only": "agent-only";
            }>>;
        }, z.core.$strip>], "type">>>>;
        options: z.ZodIntersection<z.ZodObject<{
            claudeCodeMockCliTraffic: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodBoolean;
                endpoint: z.ZodString;
            }, z.core.$strict>>;
            claudeCodePermissionMode: z.ZodOptional<z.ZodLiteral<"plan">>;
            memoryEnabled: z.ZodOptional<z.ZodBoolean>;
            model: z.ZodString;
            providerSubagentsEnabled: z.ZodOptional<z.ZodBoolean>;
            reasoningLevel: z.ZodEnum<{
                high: "high";
                low: "low";
                max: "max";
                medium: "medium";
                none: "none";
                ultra: "ultra";
                ultracode: "ultracode";
                xhigh: "xhigh";
            }>;
            serviceTier: z.ZodEnum<{
                default: "default";
                fast: "fast";
            }>;
            workflowsEnabled: z.ZodBoolean;
        }, z.core.$strip>, z.ZodDiscriminatedUnion<[z.ZodObject<{
            approvalReviewer: z.ZodLiteral<"user">;
            permissionEscalation: z.ZodEnum<{
                ask: "ask";
                deny: "deny";
            }>;
            permissionMode: z.ZodLiteral<"accept-edits">;
            permissionScope: z.ZodLiteral<"workspace">;
        }, z.core.$strip>, z.ZodObject<{
            approvalReviewer: z.ZodLiteral<"automatic">;
            permissionEscalation: z.ZodEnum<{
                ask: "ask";
                deny: "deny";
            }>;
            permissionMode: z.ZodLiteral<"auto">;
            permissionScope: z.ZodLiteral<"workspace">;
        }, z.core.$strip>, z.ZodObject<{
            approvalReviewer: z.ZodNull;
            permissionEscalation: z.ZodNull;
            permissionMode: z.ZodLiteral<"full">;
            permissionScope: z.ZodLiteral<"full">;
        }, z.core.$strip>], "permissionMode">>;
        requestId: z.ZodString;
        resumeContext: z.ZodObject<{
            acpLaunchSpec: z.ZodOptional<z.ZodObject<{
                args: z.ZodArray<z.ZodString>;
                command: z.ZodString;
                cwd: z.ZodOptional<z.ZodString>;
                displayName: z.ZodString;
                env: z.ZodRecord<z.ZodString, z.ZodString>;
                modelCli: z.ZodOptional<z.ZodPipe<z.ZodObject<{
                    listArgs: z.ZodArray<z.ZodString>;
                    primaryModels: z.ZodArray<z.ZodString>;
                    selectFlag: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodTransform<{
                    listArgs: string[];
                    primaryModels: string[];
                    selectFlag?: string | undefined;
                } | undefined, {
                    listArgs: string[];
                    primaryModels: string[];
                    selectFlag?: string | undefined;
                }>>>;
                nativeReasoning: z.ZodOptional<z.ZodObject<{
                    configId: z.ZodString;
                    defaultLevel: z.ZodOptional<z.ZodEnum<{
                        high: "high";
                        low: "low";
                        max: "max";
                        medium: "medium";
                        none: "none";
                        ultra: "ultra";
                        ultracode: "ultracode";
                        xhigh: "xhigh";
                    }>>;
                    levelValues: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
                        high: "high";
                        low: "low";
                        max: "max";
                        medium: "medium";
                        none: "none";
                        ultra: "ultra";
                        ultracode: "ultracode";
                        xhigh: "xhigh";
                    }> & z.core.$partial, z.ZodString>>;
                    supportedLevels: z.ZodArray<z.ZodEnum<{
                        high: "high";
                        low: "low";
                        max: "max";
                        medium: "medium";
                        none: "none";
                        ultra: "ultra";
                        ultracode: "ultracode";
                        xhigh: "xhigh";
                    }>>;
                }, z.core.$strict>>;
                nativeSkillRoots: z.ZodOptional<z.ZodObject<{
                    project: z.ZodDefault<z.ZodArray<z.ZodString>>;
                    user: z.ZodDefault<z.ZodArray<z.ZodString>>;
                }, z.core.$strict>>;
                permissionCli: z.ZodOptional<z.ZodObject<{
                    full: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    insertAfterArgs: z.ZodOptional<z.ZodNumber>;
                    readonly: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    workspaceWrite: z.ZodOptional<z.ZodArray<z.ZodString>>;
                }, z.core.$strict>>;
                reasoningCli: z.ZodOptional<z.ZodObject<{
                    defaultLevel: z.ZodOptional<z.ZodEnum<{
                        high: "high";
                        low: "low";
                        max: "max";
                        medium: "medium";
                        none: "none";
                        ultra: "ultra";
                        ultracode: "ultracode";
                        xhigh: "xhigh";
                    }>>;
                    flag: z.ZodString;
                    levelValues: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
                        high: "high";
                        low: "low";
                        max: "max";
                        medium: "medium";
                        none: "none";
                        ultra: "ultra";
                        ultracode: "ultracode";
                        xhigh: "xhigh";
                    }> & z.core.$partial, z.ZodString>>;
                    supportedLevels: z.ZodArray<z.ZodEnum<{
                        high: "high";
                        low: "low";
                        max: "max";
                        medium: "medium";
                        none: "none";
                        ultra: "ultra";
                        ultracode: "ultracode";
                        xhigh: "xhigh";
                    }>>;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
            bridgeLaunch: z.ZodObject<{
                capabilities: z.ZodObject<{
                    fork: z.ZodEnum<{
                        checkpoint: "checkpoint";
                        none: "none";
                        tip: "tip";
                    }>;
                    permissionModes: z.ZodArray<z.ZodEnum<{
                        "accept-edits": "accept-edits";
                        auto: "auto";
                        full: "full";
                    }>>;
                    supportsServiceTier: z.ZodBoolean;
                    supportsThreadArchive: z.ZodBoolean;
                    supportsThreadRename: z.ZodBoolean;
                }, z.core.$strict>;
                pluginId: z.ZodString;
                source: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    byteLength: z.ZodNumber;
                    digest: z.ZodString;
                    kind: z.ZodLiteral<"artifact">;
                }, z.core.$strict>, z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodLiteral<"daemon-bundled">;
                }, z.core.$strict>], "kind">;
            }, z.core.$strict>;
            disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
            dynamicTools: z.ZodArray<z.ZodObject<{
                description: z.ZodString;
                inputSchema: z.ZodUnknown;
                name: z.ZodString;
            }, z.core.$strip>>;
            externalMcpServers: z.ZodArray<z.ZodObject<{
                args: z.ZodOptional<z.ZodArray<z.ZodString>>;
                command: z.ZodOptional<z.ZodString>;
                env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                envFromHost: z.ZodOptional<z.ZodArray<z.ZodString>>;
                name: z.ZodString;
                transport: z.ZodEnum<{
                    http: "http";
                    sse: "sse";
                    stdio: "stdio";
                }>;
                url: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
            injectedSkillSources: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                description: z.ZodString;
                entryPath: z.ZodString;
                kind: z.ZodLiteral<"tree">;
                name: z.ZodString;
                sourceType: z.ZodEnum<{
                    "data-dir": "data-dir";
                    builtin: "builtin";
                }>;
                treeHash: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                description: z.ZodString;
                kind: z.ZodLiteral<"workspace-path">;
                name: z.ZodString;
                skillFilePath: z.ZodString;
                sourceRootPath: z.ZodString;
                sourceType: z.ZodLiteral<"project">;
            }, z.core.$strict>, z.ZodObject<{
                description: z.ZodString;
                kind: z.ZodLiteral<"host-path">;
                name: z.ZodString;
                skillFilePath: z.ZodString;
                sourceRootPath: z.ZodString;
                sourceType: z.ZodEnum<{
                    "shared-project": "shared-project";
                    "shared-user": "shared-user";
                }>;
            }, z.core.$strict>], "kind">>;
            instructionMode: z.ZodEnum<{
                append: "append";
                replace: "replace";
            }>;
            instructions: z.ZodString;
            projectId: z.ZodString;
            providerId: z.ZodString;
            providerThreadId: z.ZodString;
            workspaceContext: z.ZodObject<{
                workspacePath: z.ZodString;
                workspaceProvisionType: z.ZodEnum<{
                    "managed-worktree": "managed-worktree";
                    personal: "personal";
                    unmanaged: "unmanaged";
                }>;
            }, z.core.$strip>;
        }, z.core.$strict>;
        target: z.ZodDiscriminatedUnion<[z.ZodObject<{
            mode: z.ZodLiteral<"start">;
        }, z.core.$strip>, z.ZodObject<{
            expectedTurnId: z.ZodNullable<z.ZodString>;
            mode: z.ZodLiteral<"auto">;
        }, z.core.$strip>, z.ZodObject<{
            expectedTurnId: z.ZodNullable<z.ZodString>;
            mode: z.ZodLiteral<"steer">;
        }, z.core.$strip>], "mode">;
        threadId: z.ZodString;
        type: z.ZodLiteral<"turn.submit">;
    }, z.core.$strict>, z.ZodObject<{
        appliedAs: z.ZodEnum<{
            "new-turn": "new-turn";
            steer: "steer";
        }>;
    }, z.core.$strip>, "settled", false>;
    "thread.stop": HostDaemonCommandDescriptor<"thread.stop", z.ZodObject<{
        environmentId: z.ZodString;
        intent: z.ZodEnum<{
            interrupt: "interrupt";
            release: "release";
        }>;
        threadId: z.ZodString;
        type: z.ZodLiteral<"thread.stop">;
    }, z.core.$strict>, z.ZodObject<{
        providerCheckpointId: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>, "settled", false>;
    "thread.goal.clear": HostDaemonCommandDescriptor<"thread.goal.clear", z.ZodObject<{
        acpLaunchSpec: z.ZodOptional<z.ZodObject<{
            args: z.ZodArray<z.ZodString>;
            command: z.ZodString;
            cwd: z.ZodOptional<z.ZodString>;
            displayName: z.ZodString;
            env: z.ZodRecord<z.ZodString, z.ZodString>;
            modelCli: z.ZodOptional<z.ZodPipe<z.ZodObject<{
                listArgs: z.ZodArray<z.ZodString>;
                primaryModels: z.ZodArray<z.ZodString>;
                selectFlag: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodTransform<{
                listArgs: string[];
                primaryModels: string[];
                selectFlag?: string | undefined;
            } | undefined, {
                listArgs: string[];
                primaryModels: string[];
                selectFlag?: string | undefined;
            }>>>;
            nativeReasoning: z.ZodOptional<z.ZodObject<{
                configId: z.ZodString;
                defaultLevel: z.ZodOptional<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
                levelValues: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }> & z.core.$partial, z.ZodString>>;
                supportedLevels: z.ZodArray<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
            }, z.core.$strict>>;
            nativeSkillRoots: z.ZodOptional<z.ZodObject<{
                project: z.ZodDefault<z.ZodArray<z.ZodString>>;
                user: z.ZodDefault<z.ZodArray<z.ZodString>>;
            }, z.core.$strict>>;
            permissionCli: z.ZodOptional<z.ZodObject<{
                full: z.ZodOptional<z.ZodArray<z.ZodString>>;
                insertAfterArgs: z.ZodOptional<z.ZodNumber>;
                readonly: z.ZodOptional<z.ZodArray<z.ZodString>>;
                workspaceWrite: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strict>>;
            reasoningCli: z.ZodOptional<z.ZodObject<{
                defaultLevel: z.ZodOptional<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
                flag: z.ZodString;
                levelValues: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }> & z.core.$partial, z.ZodString>>;
                supportedLevels: z.ZodArray<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        bridgeLaunch: z.ZodObject<{
            capabilities: z.ZodObject<{
                fork: z.ZodEnum<{
                    checkpoint: "checkpoint";
                    none: "none";
                    tip: "tip";
                }>;
                permissionModes: z.ZodArray<z.ZodEnum<{
                    "accept-edits": "accept-edits";
                    auto: "auto";
                    full: "full";
                }>>;
                supportsServiceTier: z.ZodBoolean;
                supportsThreadArchive: z.ZodBoolean;
                supportsThreadRename: z.ZodBoolean;
            }, z.core.$strict>;
            pluginId: z.ZodString;
            source: z.ZodDiscriminatedUnion<[z.ZodObject<{
                byteLength: z.ZodNumber;
                digest: z.ZodString;
                kind: z.ZodLiteral<"artifact">;
            }, z.core.$strict>, z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodLiteral<"daemon-bundled">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>;
        environmentId: z.ZodString;
        options: z.ZodIntersection<z.ZodObject<{
            claudeCodeMockCliTraffic: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodBoolean;
                endpoint: z.ZodString;
            }, z.core.$strict>>;
            claudeCodePermissionMode: z.ZodOptional<z.ZodLiteral<"plan">>;
            memoryEnabled: z.ZodOptional<z.ZodBoolean>;
            model: z.ZodString;
            providerSubagentsEnabled: z.ZodOptional<z.ZodBoolean>;
            reasoningLevel: z.ZodEnum<{
                high: "high";
                low: "low";
                max: "max";
                medium: "medium";
                none: "none";
                ultra: "ultra";
                ultracode: "ultracode";
                xhigh: "xhigh";
            }>;
            serviceTier: z.ZodEnum<{
                default: "default";
                fast: "fast";
            }>;
            workflowsEnabled: z.ZodBoolean;
        }, z.core.$strip>, z.ZodDiscriminatedUnion<[z.ZodObject<{
            approvalReviewer: z.ZodLiteral<"user">;
            permissionEscalation: z.ZodEnum<{
                ask: "ask";
                deny: "deny";
            }>;
            permissionMode: z.ZodLiteral<"accept-edits">;
            permissionScope: z.ZodLiteral<"workspace">;
        }, z.core.$strip>, z.ZodObject<{
            approvalReviewer: z.ZodLiteral<"automatic">;
            permissionEscalation: z.ZodEnum<{
                ask: "ask";
                deny: "deny";
            }>;
            permissionMode: z.ZodLiteral<"auto">;
            permissionScope: z.ZodLiteral<"workspace">;
        }, z.core.$strip>, z.ZodObject<{
            approvalReviewer: z.ZodNull;
            permissionEscalation: z.ZodNull;
            permissionMode: z.ZodLiteral<"full">;
            permissionScope: z.ZodLiteral<"full">;
        }, z.core.$strip>], "permissionMode">>;
        resumeContext: z.ZodObject<{
            acpLaunchSpec: z.ZodOptional<z.ZodObject<{
                args: z.ZodArray<z.ZodString>;
                command: z.ZodString;
                cwd: z.ZodOptional<z.ZodString>;
                displayName: z.ZodString;
                env: z.ZodRecord<z.ZodString, z.ZodString>;
                modelCli: z.ZodOptional<z.ZodPipe<z.ZodObject<{
                    listArgs: z.ZodArray<z.ZodString>;
                    primaryModels: z.ZodArray<z.ZodString>;
                    selectFlag: z.ZodOptional<z.ZodString>;
                }, z.core.$strict>, z.ZodTransform<{
                    listArgs: string[];
                    primaryModels: string[];
                    selectFlag?: string | undefined;
                } | undefined, {
                    listArgs: string[];
                    primaryModels: string[];
                    selectFlag?: string | undefined;
                }>>>;
                nativeReasoning: z.ZodOptional<z.ZodObject<{
                    configId: z.ZodString;
                    defaultLevel: z.ZodOptional<z.ZodEnum<{
                        high: "high";
                        low: "low";
                        max: "max";
                        medium: "medium";
                        none: "none";
                        ultra: "ultra";
                        ultracode: "ultracode";
                        xhigh: "xhigh";
                    }>>;
                    levelValues: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
                        high: "high";
                        low: "low";
                        max: "max";
                        medium: "medium";
                        none: "none";
                        ultra: "ultra";
                        ultracode: "ultracode";
                        xhigh: "xhigh";
                    }> & z.core.$partial, z.ZodString>>;
                    supportedLevels: z.ZodArray<z.ZodEnum<{
                        high: "high";
                        low: "low";
                        max: "max";
                        medium: "medium";
                        none: "none";
                        ultra: "ultra";
                        ultracode: "ultracode";
                        xhigh: "xhigh";
                    }>>;
                }, z.core.$strict>>;
                nativeSkillRoots: z.ZodOptional<z.ZodObject<{
                    project: z.ZodDefault<z.ZodArray<z.ZodString>>;
                    user: z.ZodDefault<z.ZodArray<z.ZodString>>;
                }, z.core.$strict>>;
                permissionCli: z.ZodOptional<z.ZodObject<{
                    full: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    insertAfterArgs: z.ZodOptional<z.ZodNumber>;
                    readonly: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    workspaceWrite: z.ZodOptional<z.ZodArray<z.ZodString>>;
                }, z.core.$strict>>;
                reasoningCli: z.ZodOptional<z.ZodObject<{
                    defaultLevel: z.ZodOptional<z.ZodEnum<{
                        high: "high";
                        low: "low";
                        max: "max";
                        medium: "medium";
                        none: "none";
                        ultra: "ultra";
                        ultracode: "ultracode";
                        xhigh: "xhigh";
                    }>>;
                    flag: z.ZodString;
                    levelValues: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
                        high: "high";
                        low: "low";
                        max: "max";
                        medium: "medium";
                        none: "none";
                        ultra: "ultra";
                        ultracode: "ultracode";
                        xhigh: "xhigh";
                    }> & z.core.$partial, z.ZodString>>;
                    supportedLevels: z.ZodArray<z.ZodEnum<{
                        high: "high";
                        low: "low";
                        max: "max";
                        medium: "medium";
                        none: "none";
                        ultra: "ultra";
                        ultracode: "ultracode";
                        xhigh: "xhigh";
                    }>>;
                }, z.core.$strict>>;
            }, z.core.$strict>>;
            bridgeLaunch: z.ZodObject<{
                capabilities: z.ZodObject<{
                    fork: z.ZodEnum<{
                        checkpoint: "checkpoint";
                        none: "none";
                        tip: "tip";
                    }>;
                    permissionModes: z.ZodArray<z.ZodEnum<{
                        "accept-edits": "accept-edits";
                        auto: "auto";
                        full: "full";
                    }>>;
                    supportsServiceTier: z.ZodBoolean;
                    supportsThreadArchive: z.ZodBoolean;
                    supportsThreadRename: z.ZodBoolean;
                }, z.core.$strict>;
                pluginId: z.ZodString;
                source: z.ZodDiscriminatedUnion<[z.ZodObject<{
                    byteLength: z.ZodNumber;
                    digest: z.ZodString;
                    kind: z.ZodLiteral<"artifact">;
                }, z.core.$strict>, z.ZodObject<{
                    id: z.ZodString;
                    kind: z.ZodLiteral<"daemon-bundled">;
                }, z.core.$strict>], "kind">;
            }, z.core.$strict>;
            disallowedTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
            dynamicTools: z.ZodArray<z.ZodObject<{
                description: z.ZodString;
                inputSchema: z.ZodUnknown;
                name: z.ZodString;
            }, z.core.$strip>>;
            externalMcpServers: z.ZodArray<z.ZodObject<{
                args: z.ZodOptional<z.ZodArray<z.ZodString>>;
                command: z.ZodOptional<z.ZodString>;
                env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
                envFromHost: z.ZodOptional<z.ZodArray<z.ZodString>>;
                name: z.ZodString;
                transport: z.ZodEnum<{
                    http: "http";
                    sse: "sse";
                    stdio: "stdio";
                }>;
                url: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
            injectedSkillSources: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
                description: z.ZodString;
                entryPath: z.ZodString;
                kind: z.ZodLiteral<"tree">;
                name: z.ZodString;
                sourceType: z.ZodEnum<{
                    "data-dir": "data-dir";
                    builtin: "builtin";
                }>;
                treeHash: z.ZodString;
            }, z.core.$strict>, z.ZodObject<{
                description: z.ZodString;
                kind: z.ZodLiteral<"workspace-path">;
                name: z.ZodString;
                skillFilePath: z.ZodString;
                sourceRootPath: z.ZodString;
                sourceType: z.ZodLiteral<"project">;
            }, z.core.$strict>, z.ZodObject<{
                description: z.ZodString;
                kind: z.ZodLiteral<"host-path">;
                name: z.ZodString;
                skillFilePath: z.ZodString;
                sourceRootPath: z.ZodString;
                sourceType: z.ZodEnum<{
                    "shared-project": "shared-project";
                    "shared-user": "shared-user";
                }>;
            }, z.core.$strict>], "kind">>;
            instructionMode: z.ZodEnum<{
                append: "append";
                replace: "replace";
            }>;
            instructions: z.ZodString;
            projectId: z.ZodString;
            providerId: z.ZodString;
            providerThreadId: z.ZodString;
            workspaceContext: z.ZodObject<{
                workspacePath: z.ZodString;
                workspaceProvisionType: z.ZodEnum<{
                    "managed-worktree": "managed-worktree";
                    personal: "personal";
                    unmanaged: "unmanaged";
                }>;
            }, z.core.$strip>;
        }, z.core.$strict>;
        threadId: z.ZodString;
        type: z.ZodLiteral<"thread.goal.clear">;
    }, z.core.$strict>, z.ZodObject<{
        cleared: z.ZodBoolean;
    }, z.core.$strict>, "settled", false>;
    "thread.plan.cancel": HostDaemonCommandDescriptor<"thread.plan.cancel", z.ZodObject<{
        environmentId: z.ZodString;
        expectedTurnId: z.ZodString;
        threadId: z.ZodString;
        type: z.ZodLiteral<"thread.plan.cancel">;
    }, z.core.$strict>, z.ZodObject<{
        cancelled: z.ZodBoolean;
    }, z.core.$strict>, "settled", false>;
    "thread.rename": HostDaemonCommandDescriptor<"thread.rename", z.ZodObject<{
        environmentId: z.ZodString;
        threadId: z.ZodString;
        title: z.ZodString;
        type: z.ZodLiteral<"thread.rename">;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strip>, "settled", false>;
    "thread.archive": HostDaemonCommandDescriptor<"thread.archive", z.ZodObject<{
        bridgeLaunch: z.ZodObject<{
            capabilities: z.ZodObject<{
                fork: z.ZodEnum<{
                    checkpoint: "checkpoint";
                    none: "none";
                    tip: "tip";
                }>;
                permissionModes: z.ZodArray<z.ZodEnum<{
                    "accept-edits": "accept-edits";
                    auto: "auto";
                    full: "full";
                }>>;
                supportsServiceTier: z.ZodBoolean;
                supportsThreadArchive: z.ZodBoolean;
                supportsThreadRename: z.ZodBoolean;
            }, z.core.$strict>;
            pluginId: z.ZodString;
            source: z.ZodDiscriminatedUnion<[z.ZodObject<{
                byteLength: z.ZodNumber;
                digest: z.ZodString;
                kind: z.ZodLiteral<"artifact">;
            }, z.core.$strict>, z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodLiteral<"daemon-bundled">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>;
        environmentId: z.ZodString;
        providerId: z.ZodString;
        providerThreadId: z.ZodString;
        threadId: z.ZodString;
        type: z.ZodLiteral<"thread.archive">;
        workspaceContext: z.ZodObject<{
            workspacePath: z.ZodString;
            workspaceProvisionType: z.ZodEnum<{
                "managed-worktree": "managed-worktree";
                personal: "personal";
                unmanaged: "unmanaged";
            }>;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strip>, "settled", false>;
    "thread.unarchive": HostDaemonCommandDescriptor<"thread.unarchive", z.ZodObject<{
        bridgeLaunch: z.ZodObject<{
            capabilities: z.ZodObject<{
                fork: z.ZodEnum<{
                    checkpoint: "checkpoint";
                    none: "none";
                    tip: "tip";
                }>;
                permissionModes: z.ZodArray<z.ZodEnum<{
                    "accept-edits": "accept-edits";
                    auto: "auto";
                    full: "full";
                }>>;
                supportsServiceTier: z.ZodBoolean;
                supportsThreadArchive: z.ZodBoolean;
                supportsThreadRename: z.ZodBoolean;
            }, z.core.$strict>;
            pluginId: z.ZodString;
            source: z.ZodDiscriminatedUnion<[z.ZodObject<{
                byteLength: z.ZodNumber;
                digest: z.ZodString;
                kind: z.ZodLiteral<"artifact">;
            }, z.core.$strict>, z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodLiteral<"daemon-bundled">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>;
        environmentId: z.ZodString;
        providerId: z.ZodString;
        providerThreadId: z.ZodString;
        threadId: z.ZodString;
        type: z.ZodLiteral<"thread.unarchive">;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strip>, "settled", false>;
    "interactive.resolve": HostDaemonCommandDescriptor<"interactive.resolve", z.ZodObject<{
        environmentId: z.ZodString;
        interactionId: z.ZodString;
        providerId: z.ZodString;
        providerRequestId: z.ZodString;
        providerThreadId: z.ZodString;
        resolution: z.ZodUnion<readonly [z.ZodDiscriminatedUnion<[z.ZodObject<{
            decision: z.ZodLiteral<"allow_once">;
            grantedPermissions: z.ZodNullable<z.ZodObject<{
                fileSystem: z.ZodNullable<z.ZodObject<{
                    read: z.ZodArray<z.ZodString>;
                    write: z.ZodArray<z.ZodString>;
                }, z.core.$strip>>;
                network: z.ZodNullable<z.ZodObject<{
                    enabled: z.ZodNullable<z.ZodBoolean>;
                }, z.core.$strip>>;
            }, z.core.$strict>>;
        }, z.core.$strip>, z.ZodObject<{
            decision: z.ZodLiteral<"allow_for_session">;
            grantedPermissions: z.ZodNullable<z.ZodObject<{
                fileSystem: z.ZodNullable<z.ZodObject<{
                    read: z.ZodArray<z.ZodString>;
                    write: z.ZodArray<z.ZodString>;
                }, z.core.$strip>>;
                network: z.ZodNullable<z.ZodObject<{
                    enabled: z.ZodNullable<z.ZodBoolean>;
                }, z.core.$strip>>;
            }, z.core.$strict>>;
        }, z.core.$strip>, z.ZodObject<{
            decision: z.ZodLiteral<"deny">;
        }, z.core.$strip>], "decision">, z.ZodObject<{
            answers: z.ZodRecord<z.ZodString, z.ZodObject<{
                freeText: z.ZodOptional<z.ZodString>;
                selected: z.ZodArray<z.ZodString>;
            }, z.core.$strip>>;
            kind: z.ZodLiteral<"user_answer">;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"plugin_submitted">;
        }, z.core.$strip>]>;
        threadId: z.ZodString;
        type: z.ZodLiteral<"interactive.resolve">;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strip>, "settled", false>;
    "codex.inference.complete": HostDaemonCommandDescriptor<"codex.inference.complete", z.ZodObject<{
        model: z.ZodString;
        outputSchema: z.ZodType<JsonObject, unknown, z.core.$ZodTypeInternals<JsonObject, unknown>>;
        prompt: z.ZodString;
        reasoningEffort: z.ZodLiteral<"none">;
        timeoutMs: z.ZodNumber;
        type: z.ZodLiteral<"codex.inference.complete">;
    }, z.core.$strict>, z.ZodObject<{
        model: z.ZodString;
        value: z.ZodType<JsonObject, unknown, z.core.$ZodTypeInternals<JsonObject, unknown>>;
    }, z.core.$strip>, "settled", false>;
    "codex.voice.transcribe": HostDaemonCommandDescriptor<"codex.voice.transcribe", z.ZodObject<{
        audioBase64: z.ZodString;
        filename: z.ZodString;
        mimeType: z.ZodString;
        model: z.ZodString;
        prompt: z.ZodNullable<z.ZodString>;
        timeoutMs: z.ZodNumber;
        type: z.ZodLiteral<"codex.voice.transcribe">;
    }, z.core.$strict>, z.ZodObject<{
        model: z.ZodString;
        text: z.ZodString;
    }, z.core.$strip>, "settled", false>;
    "environment.provision": HostDaemonCommandDescriptor<"environment.provision", z.ZodDiscriminatedUnion<[z.ZodObject<{
        checkout: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"existing">;
            name: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            baseBranch: z.ZodString;
            kind: z.ZodLiteral<"new">;
            name: z.ZodString;
        }, z.core.$strict>], "kind">>;
        environmentId: z.ZodString;
        initiator: z.ZodNullable<z.ZodObject<{
            provisioningId: z.ZodString;
            threadId: z.ZodString;
        }, z.core.$strict>>;
        path: z.ZodString;
        type: z.ZodLiteral<"environment.provision">;
        workspaceProvisionType: z.ZodLiteral<"unmanaged">;
    }, z.core.$strict>, z.ZodObject<{
        baseBranch: z.ZodNullable<z.ZodString>;
        branchName: z.ZodString;
        environmentId: z.ZodString;
        initiator: z.ZodNullable<z.ZodObject<{
            provisioningId: z.ZodString;
            threadId: z.ZodString;
        }, z.core.$strict>>;
        setupTimeoutMs: z.ZodNumber;
        sourcePath: z.ZodString;
        targetPath: z.ZodString;
        type: z.ZodLiteral<"environment.provision">;
        workspaceProvisionType: z.ZodLiteral<"managed-worktree">;
    }, z.core.$strict>, z.ZodObject<{
        environmentId: z.ZodString;
        initiator: z.ZodNullable<z.ZodObject<{
            provisioningId: z.ZodString;
            threadId: z.ZodString;
        }, z.core.$strict>>;
        targetPath: z.ZodString;
        type: z.ZodLiteral<"environment.provision">;
        workspaceProvisionType: z.ZodLiteral<"personal">;
    }, z.core.$strict>], "workspaceProvisionType">, z.ZodObject<{
        branchName: z.ZodNullable<z.ZodString>;
        defaultBranch: z.ZodNullable<z.ZodString>;
        isGitRepo: z.ZodBoolean;
        isWorktree: z.ZodBoolean;
        path: z.ZodString;
        transcript: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            startedAt: z.ZodOptional<z.ZodNumber>;
            status: z.ZodOptional<z.ZodEnum<{
                completed: "completed";
                failed: "failed";
                started: "started";
            }>>;
            text: z.ZodString;
            type: z.ZodEnum<{
                output: "output";
                step: "step";
            }>;
        }, z.core.$strip>>;
    }, z.core.$strip>, "settled", false>;
    "project.clone": HostDaemonCommandDescriptor<"project.clone", z.ZodObject<{
        projectSlug: z.ZodString;
        remoteUrl: z.ZodString;
        targetPath: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"project.clone">;
    }, z.core.$strict>, z.ZodObject<{
        gitRemoteUrl: z.ZodNullable<z.ZodString>;
        path: z.ZodString;
    }, z.core.$strict>, "settled", false>;
    "environment.provision.cancel": HostDaemonCommandDescriptor<"environment.provision.cancel", z.ZodObject<{
        environmentId: z.ZodString;
        type: z.ZodLiteral<"environment.provision.cancel">;
    }, z.core.$strict>, z.ZodObject<{
        aborted: z.ZodBoolean;
    }, z.core.$strip>, "settled", false>;
    "environment.destroy": HostDaemonCommandDescriptor<"environment.destroy", z.ZodObject<{
        environmentId: z.ZodString;
        type: z.ZodLiteral<"environment.destroy">;
        workspaceContext: z.ZodObject<{
            workspacePath: z.ZodString;
            workspaceProvisionType: z.ZodEnum<{
                "managed-worktree": "managed-worktree";
                personal: "personal";
                unmanaged: "unmanaged";
            }>;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodObject<{}, z.core.$strip>, "settled", false>;
    "workspace.commit": HostDaemonCommandDescriptor<"workspace.commit", z.ZodObject<{
        environmentId: z.ZodString;
        message: z.ZodString;
        type: z.ZodLiteral<"workspace.commit">;
        workspaceContext: z.ZodObject<{
            workspacePath: z.ZodString;
            workspaceProvisionType: z.ZodEnum<{
                "managed-worktree": "managed-worktree";
                personal: "personal";
                unmanaged: "unmanaged";
            }>;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodObject<{
        commitSha: z.ZodString;
        commitSubject: z.ZodString;
    }, z.core.$strip>, "settled", false>;
    "workspace.squash_merge": HostDaemonCommandDescriptor<"workspace.squash_merge", z.ZodObject<{
        commitMessage: z.ZodString;
        environmentId: z.ZodString;
        targetBranch: z.ZodString;
        type: z.ZodLiteral<"workspace.squash_merge">;
        workspaceContext: z.ZodObject<{
            workspacePath: z.ZodString;
            workspaceProvisionType: z.ZodEnum<{
                "managed-worktree": "managed-worktree";
                personal: "personal";
                unmanaged: "unmanaged";
            }>;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodObject<{
        commitSha: z.ZodString;
        commitSubject: z.ZodString;
        merged: z.ZodBoolean;
    }, z.core.$strip>, "settled", false>;
    "workspace.pull_request_action": HostDaemonCommandDescriptor<"workspace.pull_request_action", z.ZodDiscriminatedUnion<[z.ZodObject<{
        environmentId: z.ZodString;
        operation: z.ZodLiteral<"ready">;
        type: z.ZodLiteral<"workspace.pull_request_action">;
        workspaceContext: z.ZodObject<{
            workspacePath: z.ZodString;
            workspaceProvisionType: z.ZodEnum<{
                "managed-worktree": "managed-worktree";
                personal: "personal";
                unmanaged: "unmanaged";
            }>;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodObject<{
        environmentId: z.ZodString;
        operation: z.ZodLiteral<"draft">;
        type: z.ZodLiteral<"workspace.pull_request_action">;
        workspaceContext: z.ZodObject<{
            workspacePath: z.ZodString;
            workspaceProvisionType: z.ZodEnum<{
                "managed-worktree": "managed-worktree";
                personal: "personal";
                unmanaged: "unmanaged";
            }>;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodObject<{
        environmentId: z.ZodString;
        method: z.ZodEnum<{
            merge: "merge";
            rebase: "rebase";
            squash: "squash";
        }>;
        operation: z.ZodLiteral<"merge">;
        type: z.ZodLiteral<"workspace.pull_request_action">;
        workspaceContext: z.ZodObject<{
            workspacePath: z.ZodString;
            workspaceProvisionType: z.ZodEnum<{
                "managed-worktree": "managed-worktree";
                personal: "personal";
                unmanaged: "unmanaged";
            }>;
        }, z.core.$strip>;
    }, z.core.$strict>], "operation">, z.ZodObject<{}, z.core.$strict>, "settled", false>;
    "host.list_files": HostDaemonCommandDescriptor<"host.list_files", z.ZodObject<{
        limit: z.ZodNumber;
        path: z.ZodString;
        query: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"host.list_files">;
    }, z.core.$strip>, z.ZodObject<{
        files: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            path: z.ZodString;
        }, z.core.$strip>>;
        truncated: z.ZodBoolean;
    }, z.core.$strip>, "onlineRpc", true>;
    "host.list_paths": HostDaemonCommandDescriptor<"host.list_paths", z.ZodObject<{
        includeDirectories: z.ZodBoolean;
        includeFiles: z.ZodBoolean;
        limit: z.ZodNumber;
        path: z.ZodString;
        query: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"host.list_paths">;
    }, z.core.$strip>, z.ZodObject<{
        paths: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                directory: "directory";
                file: "file";
            }>;
            name: z.ZodString;
            path: z.ZodString;
            positions: z.ZodArray<z.ZodNumber>;
            score: z.ZodNumber;
        }, z.core.$strip>>;
        truncated: z.ZodBoolean;
    }, z.core.$strip>, "onlineRpc", true>;
    "host.mkdir": HostDaemonCommandDescriptor<"host.mkdir", z.ZodObject<{
        path: z.ZodString;
        recursive: z.ZodBoolean;
        rootPath: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"host.mkdir">;
    }, z.core.$strict>, z.ZodObject<{
        ok: z.ZodLiteral<true>;
    }, z.core.$strict>, "onlineRpc", false>;
    "host.move_path": HostDaemonCommandDescriptor<"host.move_path", z.ZodObject<{
        destinationPath: z.ZodString;
        rootPath: z.ZodOptional<z.ZodString>;
        sourcePath: z.ZodString;
        type: z.ZodLiteral<"host.move_path">;
    }, z.core.$strict>, z.ZodObject<{
        ok: z.ZodLiteral<true>;
    }, z.core.$strict>, "onlineRpc", false>;
    "host.remove_path": HostDaemonCommandDescriptor<"host.remove_path", z.ZodObject<{
        path: z.ZodString;
        recursive: z.ZodBoolean;
        rootPath: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"host.remove_path">;
    }, z.core.$strict>, z.ZodObject<{
        ok: z.ZodLiteral<true>;
    }, z.core.$strict>, "onlineRpc", false>;
    "host.browse_directory": HostDaemonCommandDescriptor<"host.browse_directory", z.ZodObject<{
        path: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"host.browse_directory">;
    }, z.core.$strip>, z.ZodObject<{
        directory: z.ZodString;
        entries: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                directory: "directory";
                file: "file";
            }>;
            name: z.ZodString;
            path: z.ZodString;
        }, z.core.$strip>>;
        parent: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>, "onlineRpc", true>;
    "host.paths_exist": HostDaemonCommandDescriptor<"host.paths_exist", z.ZodObject<{
        paths: z.ZodPipe<z.ZodArray<z.ZodString>, z.ZodTransform<string[], string[]>>;
        type: z.ZodLiteral<"host.paths_exist">;
    }, z.core.$strict>, z.ZodObject<{
        existence: z.ZodRecord<z.ZodString, z.ZodBoolean>;
    }, z.core.$strip>, "onlineRpc", true>;
    "project.inspect": HostDaemonCommandDescriptor<"project.inspect", z.ZodObject<{
        path: z.ZodString;
        type: z.ZodLiteral<"project.inspect">;
    }, z.core.$strict>, z.ZodObject<{
        gitRemoteUrl: z.ZodNullable<z.ZodString>;
        path: z.ZodString;
    }, z.core.$strict>, "onlineRpc", true>;
    "project.clone_default_path": HostDaemonCommandDescriptor<"project.clone_default_path", z.ZodObject<{
        projectSlug: z.ZodString;
        type: z.ZodLiteral<"project.clone_default_path">;
    }, z.core.$strict>, z.ZodObject<{
        path: z.ZodString;
    }, z.core.$strict>, "onlineRpc", true>;
    "host.pick_folder": HostDaemonCommandDescriptor<"host.pick_folder", z.ZodObject<{
        type: z.ZodLiteral<"host.pick_folder">;
    }, z.core.$strict>, z.ZodObject<{
        path: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>, "onlineRpc", false>;
    "plugin.host.call": HostDaemonCommandDescriptor<"plugin.host.call", z.ZodObject<{
        artifact: z.ZodObject<{
            byteLength: z.ZodNumber;
            digest: z.ZodString;
        }, z.core.$strict>;
        callId: z.ZodString;
        generation: z.ZodString;
        input: z.ZodType<JsonValue, unknown, z.core.$ZodTypeInternals<JsonValue, unknown>>;
        method: z.ZodString;
        pluginId: z.ZodString;
        timeoutMs: z.ZodNumber;
        type: z.ZodLiteral<"plugin.host.call">;
    }, z.core.$strict>, z.ZodObject<{
        output: z.ZodType<JsonValue, unknown, z.core.$ZodTypeInternals<JsonValue, unknown>>;
    }, z.core.$strict>, "onlineRpc", false>;
    "plugin.host.cancel": HostDaemonCommandDescriptor<"plugin.host.cancel", z.ZodObject<{
        callId: z.ZodString;
        generation: z.ZodString;
        pluginId: z.ZodString;
        type: z.ZodLiteral<"plugin.host.cancel">;
    }, z.core.$strict>, z.ZodObject<{
        cancelled: z.ZodBoolean;
    }, z.core.$strict>, "onlineRpc", true>;
    "plugin.host.dispose": HostDaemonCommandDescriptor<"plugin.host.dispose", z.ZodObject<{
        generation: z.ZodString;
        pluginId: z.ZodString;
        type: z.ZodLiteral<"plugin.host.dispose">;
    }, z.core.$strict>, z.ZodObject<{
        disposed: z.ZodBoolean;
    }, z.core.$strict>, "onlineRpc", true>;
    "connect-tunnel.ensure-identity": HostDaemonCommandDescriptor<"connect-tunnel.ensure-identity", z.ZodObject<{
        type: z.ZodLiteral<"connect-tunnel.ensure-identity">;
    }, z.core.$strict>, z.ZodObject<{
        baseDomain: z.ZodString;
        label: z.ZodString;
    }, z.core.$strict>, "onlineRpc", true>;
    "host.list_commands": HostDaemonCommandDescriptor<"host.list_commands", z.ZodObject<{
        cwd: z.ZodNullable<z.ZodString>;
        nativeSkillRoots: z.ZodOptional<z.ZodObject<{
            project: z.ZodDefault<z.ZodArray<z.ZodString>>;
            user: z.ZodDefault<z.ZodArray<z.ZodString>>;
        }, z.core.$strict>>;
        providerId: z.ZodString;
        type: z.ZodLiteral<"host.list_commands">;
    }, z.core.$strict>, z.ZodObject<{
        commands: z.ZodArray<z.ZodObject<{
            argumentHint: z.ZodNullable<z.ZodString>;
            description: z.ZodNullable<z.ZodString>;
            name: z.ZodString;
            origin: z.ZodEnum<{
                project: "project";
                user: "user";
            }>;
            source: z.ZodEnum<{
                command: "command";
                skill: "skill";
            }>;
        }, z.core.$strip>>;
    }, z.core.$strip>, "onlineRpc", true>;
    "host.list_skills": HostDaemonCommandDescriptor<"host.list_skills", z.ZodObject<{
        cwd: z.ZodNullable<z.ZodString>;
        nativeSkillRoots: z.ZodOptional<z.ZodObject<{
            project: z.ZodDefault<z.ZodArray<z.ZodString>>;
            user: z.ZodDefault<z.ZodArray<z.ZodString>>;
        }, z.core.$strict>>;
        providerId: z.ZodString;
        type: z.ZodLiteral<"host.list_skills">;
    }, z.core.$strict>, z.ZodObject<{
        skills: z.ZodArray<z.ZodObject<{
            description: z.ZodNullable<z.ZodString>;
            filePath: z.ZodString;
            id: z.ZodString;
            linked: z.ZodBoolean;
            name: z.ZodString;
            rootKind: z.ZodEnum<{
                "bb-builtin": "bb-builtin";
                "bb-data-dir": "bb-data-dir";
                "bb-project": "bb-project";
                "provider-project": "provider-project";
                "provider-user": "provider-user";
                "shared-project": "shared-project";
                "shared-user": "shared-user";
                plugin: "plugin";
            }>;
        }, z.core.$strip>>;
    }, z.core.$strip>, "onlineRpc", true>;
    "host.delete_skill": HostDaemonCommandDescriptor<"host.delete_skill", z.ZodObject<{
        cwd: z.ZodNullable<z.ZodString>;
        name: z.ZodString;
        rootPath: z.ZodNullable<z.ZodString>;
        scope: z.ZodEnum<{
            "bb-project": "bb-project";
            "bb-user": "bb-user";
            "provider-project": "provider-project";
            "provider-user": "provider-user";
        }>;
        type: z.ZodLiteral<"host.delete_skill">;
    }, z.core.$strict>, z.ZodObject<{
        deletedPath: z.ZodString;
    }, z.core.$strip>, "onlineRpc", false>;
    "host.write_skill": HostDaemonCommandDescriptor<"host.write_skill", z.ZodObject<{
        content: z.ZodString;
        cwd: z.ZodNullable<z.ZodString>;
        expectedSha256: z.ZodString;
        name: z.ZodString;
        scope: z.ZodEnum<{
            "bb-project": "bb-project";
            "bb-user": "bb-user";
        }>;
        type: z.ZodLiteral<"host.write_skill">;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        filePath: z.ZodString;
        outcome: z.ZodLiteral<"written">;
        sha256: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        currentSha256: z.ZodNullable<z.ZodString>;
        outcome: z.ZodLiteral<"conflict">;
    }, z.core.$strip>], "outcome">, "onlineRpc", false>;
    "host.install_global_skills": HostDaemonCommandDescriptor<"host.install_global_skills", z.ZodObject<{
        skills: z.ZodArray<z.ZodObject<{
            entryPath: z.ZodString;
            name: z.ZodString;
            treeHash: z.ZodString;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"host.install_global_skills">;
    }, z.core.$strict>, z.ZodObject<{
        installations: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            path: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>, "onlineRpc", false>;
    "host.global_skills_status": HostDaemonCommandDescriptor<"host.global_skills_status", z.ZodObject<{
        names: z.ZodArray<z.ZodString>;
        type: z.ZodLiteral<"host.global_skills_status">;
    }, z.core.$strict>, z.ZodObject<{
        entries: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            path: z.ZodString;
            treeHash: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>, "onlineRpc", true>;
    "host.list_branches": HostDaemonCommandDescriptor<"host.list_branches", z.ZodObject<{
        limit: z.ZodNumber;
        path: z.ZodString;
        query: z.ZodOptional<z.ZodString>;
        selectedBranch: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"host.list_branches">;
    }, z.core.$strip>, z.ZodObject<{
        branches: z.ZodArray<z.ZodString>;
        branchesTruncated: z.ZodBoolean;
        checkout: z.ZodDiscriminatedUnion<[z.ZodObject<{
            branchName: z.ZodString;
            headSha: z.ZodNullable<z.ZodString>;
            kind: z.ZodLiteral<"branch">;
        }, z.core.$strip>, z.ZodObject<{
            headSha: z.ZodNullable<z.ZodString>;
            kind: z.ZodLiteral<"detached">;
        }, z.core.$strip>, z.ZodObject<{
            branchName: z.ZodNullable<z.ZodString>;
            kind: z.ZodLiteral<"unborn">;
        }, z.core.$strip>, z.ZodObject<{
            kind: z.ZodLiteral<"unknown">;
            reason: z.ZodString;
        }, z.core.$strip>], "kind">;
        defaultBranch: z.ZodNullable<z.ZodString>;
        defaultBranchRelation: z.ZodNullable<z.ZodEnum<{
            "local-ahead": "local-ahead";
            "local-behind": "local-behind";
            diverged: "diverged";
            equal: "equal";
            unknown: "unknown";
        }>>;
        hasUncommittedChanges: z.ZodBoolean;
        operation: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"none">;
        }, z.core.$strip>, z.ZodObject<{
            hasConflicts: z.ZodBoolean;
            kind: z.ZodLiteral<"merge">;
        }, z.core.$strip>, z.ZodObject<{
            hasConflicts: z.ZodBoolean;
            kind: z.ZodLiteral<"rebase">;
        }, z.core.$strip>, z.ZodObject<{
            hasConflicts: z.ZodBoolean;
            kind: z.ZodLiteral<"cherry-pick">;
        }, z.core.$strip>, z.ZodObject<{
            hasConflicts: z.ZodBoolean;
            kind: z.ZodLiteral<"revert">;
        }, z.core.$strip>, z.ZodObject<{
            hasConflicts: z.ZodBoolean;
            kind: z.ZodLiteral<"unknown">;
            reason: z.ZodString;
        }, z.core.$strip>], "kind">;
        originDefaultBranch: z.ZodNullable<z.ZodString>;
        remoteBranches: z.ZodArray<z.ZodString>;
        remoteBranchesTruncated: z.ZodBoolean;
        selectedBranch: z.ZodNullable<z.ZodObject<{
            kind: z.ZodEnum<{
                local: "local";
                missing: "missing";
                remote: "remote";
            }>;
            name: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>, "onlineRpc", true>;
    "host.file_metadata": HostDaemonCommandDescriptor<"host.file_metadata", z.ZodObject<{
        path: z.ZodString;
        rootPath: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"host.file_metadata">;
    }, z.core.$strict>, z.ZodObject<{
        modifiedAtMs: z.ZodNumber;
        path: z.ZodString;
        sizeBytes: z.ZodNumber;
    }, z.core.$strip>, "onlineRpc", true>;
    "host.read_file": HostDaemonCommandDescriptor<"host.read_file", z.ZodObject<{
        path: z.ZodString;
        ref: z.ZodOptional<z.ZodString>;
        rootPath: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"host.read_file">;
    }, z.core.$strip>, z.ZodObject<{
        content: z.ZodString;
        contentEncoding: z.ZodEnum<{
            base64: "base64";
            utf8: "utf8";
        }>;
        mimeType: z.ZodOptional<z.ZodString>;
        modifiedAtMs: z.ZodOptional<z.ZodNumber>;
        path: z.ZodString;
        sha256: z.ZodString;
        sizeBytes: z.ZodNumber;
    }, z.core.$strip>, "onlineRpc", true>;
    "host.read_file_relative": HostDaemonCommandDescriptor<"host.read_file_relative", z.ZodObject<{
        dotfiles: z.ZodEnum<{
            allow: "allow";
            deny: "deny";
        }>;
        path: z.ZodString;
        rootPath: z.ZodString;
        type: z.ZodLiteral<"host.read_file_relative">;
    }, z.core.$strict>, z.ZodObject<{
        content: z.ZodString;
        contentEncoding: z.ZodEnum<{
            base64: "base64";
            utf8: "utf8";
        }>;
        mimeType: z.ZodOptional<z.ZodString>;
        modifiedAtMs: z.ZodOptional<z.ZodNumber>;
        path: z.ZodString;
        sha256: z.ZodString;
        sizeBytes: z.ZodNumber;
    }, z.core.$strip>, "onlineRpc", true>;
    "host.write_file": HostDaemonCommandDescriptor<"host.write_file", z.ZodObject<{
        content: z.ZodString;
        contentEncoding: z.ZodEnum<{
            base64: "base64";
            utf8: "utf8";
        }>;
        createParents: z.ZodBoolean;
        expectedSha256: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        mode: z.ZodOptional<z.ZodNumber>;
        path: z.ZodString;
        rootPath: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"host.write_file">;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        outcome: z.ZodLiteral<"written">;
        sha256: z.ZodString;
        sizeBytes: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        currentSha256: z.ZodNullable<z.ZodString>;
        outcome: z.ZodLiteral<"conflict">;
    }, z.core.$strict>], "outcome">, "onlineRpc", false>;
    "provider.list_models": HostDaemonCommandDescriptor<"provider.list_models", z.ZodObject<{
        acpLaunchSpec: z.ZodOptional<z.ZodObject<{
            args: z.ZodArray<z.ZodString>;
            command: z.ZodString;
            cwd: z.ZodOptional<z.ZodString>;
            displayName: z.ZodString;
            env: z.ZodRecord<z.ZodString, z.ZodString>;
            modelCli: z.ZodOptional<z.ZodPipe<z.ZodObject<{
                listArgs: z.ZodArray<z.ZodString>;
                primaryModels: z.ZodArray<z.ZodString>;
                selectFlag: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>, z.ZodTransform<{
                listArgs: string[];
                primaryModels: string[];
                selectFlag?: string | undefined;
            } | undefined, {
                listArgs: string[];
                primaryModels: string[];
                selectFlag?: string | undefined;
            }>>>;
            nativeReasoning: z.ZodOptional<z.ZodObject<{
                configId: z.ZodString;
                defaultLevel: z.ZodOptional<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
                levelValues: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }> & z.core.$partial, z.ZodString>>;
                supportedLevels: z.ZodArray<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
            }, z.core.$strict>>;
            nativeSkillRoots: z.ZodOptional<z.ZodObject<{
                project: z.ZodDefault<z.ZodArray<z.ZodString>>;
                user: z.ZodDefault<z.ZodArray<z.ZodString>>;
            }, z.core.$strict>>;
            permissionCli: z.ZodOptional<z.ZodObject<{
                full: z.ZodOptional<z.ZodArray<z.ZodString>>;
                insertAfterArgs: z.ZodOptional<z.ZodNumber>;
                readonly: z.ZodOptional<z.ZodArray<z.ZodString>>;
                workspaceWrite: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strict>>;
            reasoningCli: z.ZodOptional<z.ZodObject<{
                defaultLevel: z.ZodOptional<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
                flag: z.ZodString;
                levelValues: z.ZodOptional<z.ZodRecord<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }> & z.core.$partial, z.ZodString>>;
                supportedLevels: z.ZodArray<z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        bridgeLaunch: z.ZodObject<{
            capabilities: z.ZodObject<{
                fork: z.ZodEnum<{
                    checkpoint: "checkpoint";
                    none: "none";
                    tip: "tip";
                }>;
                permissionModes: z.ZodArray<z.ZodEnum<{
                    "accept-edits": "accept-edits";
                    auto: "auto";
                    full: "full";
                }>>;
                supportsServiceTier: z.ZodBoolean;
                supportsThreadArchive: z.ZodBoolean;
                supportsThreadRename: z.ZodBoolean;
            }, z.core.$strict>;
            pluginId: z.ZodString;
            source: z.ZodDiscriminatedUnion<[z.ZodObject<{
                byteLength: z.ZodNumber;
                digest: z.ZodString;
                kind: z.ZodLiteral<"artifact">;
            }, z.core.$strict>, z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodLiteral<"daemon-bundled">;
            }, z.core.$strict>], "kind">;
        }, z.core.$strict>;
        cwd: z.ZodOptional<z.ZodString>;
        providerId: z.ZodString;
        type: z.ZodLiteral<"provider.list_models">;
    }, z.core.$strip>, z.ZodObject<{
        models: z.ZodArray<z.ZodObject<{
            defaultReasoningEffort: z.ZodEnum<{
                high: "high";
                low: "low";
                max: "max";
                medium: "medium";
                none: "none";
                ultra: "ultra";
                ultracode: "ultracode";
                xhigh: "xhigh";
            }>;
            description: z.ZodString;
            displayName: z.ZodString;
            id: z.ZodString;
            isDefault: z.ZodBoolean;
            model: z.ZodString;
            routeProviderId: z.ZodOptional<z.ZodString>;
            supportedReasoningEfforts: z.ZodArray<z.ZodObject<{
                description: z.ZodString;
                reasoningEffort: z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        selectedOnlyModels: z.ZodArray<z.ZodObject<{
            defaultReasoningEffort: z.ZodEnum<{
                high: "high";
                low: "low";
                max: "max";
                medium: "medium";
                none: "none";
                ultra: "ultra";
                ultracode: "ultracode";
                xhigh: "xhigh";
            }>;
            description: z.ZodString;
            displayName: z.ZodString;
            id: z.ZodString;
            isDefault: z.ZodBoolean;
            model: z.ZodString;
            routeProviderId: z.ZodOptional<z.ZodString>;
            supportedReasoningEfforts: z.ZodArray<z.ZodObject<{
                description: z.ZodString;
                reasoningEffort: z.ZodEnum<{
                    high: "high";
                    low: "low";
                    max: "max";
                    medium: "medium";
                    none: "none";
                    ultra: "ultra";
                    ultracode: "ultracode";
                    xhigh: "xhigh";
                }>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>, "onlineRpc", true>;
    "known_acp_agents.status": HostDaemonCommandDescriptor<"known_acp_agents.status", z.ZodObject<{
        agents: z.ZodArray<z.ZodObject<{
            executableName: z.ZodString;
            id: z.ZodString;
        }, z.core.$strict>>;
        type: z.ZodLiteral<"known_acp_agents.status">;
    }, z.core.$strict>, z.ZodObject<{
        agents: z.ZodArray<z.ZodObject<{
            executableName: z.ZodString;
            executablePath: z.ZodNullable<z.ZodString>;
            id: z.ZodString;
            installed: z.ZodBoolean;
        }, z.core.$strict>>;
    }, z.core.$strict>, "onlineRpc", true>;
    "provider.usage": HostDaemonCommandDescriptor<"provider.usage", z.ZodObject<{
        type: z.ZodLiteral<"provider.usage">;
    }, z.core.$strict>, z.ZodObject<{
        claudeCode: z.ZodDiscriminatedUnion<[z.ZodObject<{
            accountEmail: z.ZodNullable<z.ZodString>;
            planLabel: z.ZodNullable<z.ZodString>;
            status: z.ZodLiteral<"ok">;
            windows: z.ZodArray<z.ZodObject<{
                cost: z.ZodOptional<z.ZodObject<{
                    limitUsdCents: z.ZodNumber;
                    usedUsdCents: z.ZodNumber;
                }, z.core.$strip>>;
                label: z.ZodString;
                resetsAt: z.ZodNullable<z.ZodString>;
                usedPercent: z.ZodNumber;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            status: z.ZodLiteral<"not_installed">;
        }, z.core.$strip>, z.ZodObject<{
            status: z.ZodLiteral<"unauthenticated">;
        }, z.core.$strip>, z.ZodObject<{
            status: z.ZodLiteral<"expired">;
        }, z.core.$strip>, z.ZodObject<{
            accountEmail: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            message: z.ZodString;
            planLabel: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            status: z.ZodLiteral<"error">;
        }, z.core.$strip>], "status">;
        codex: z.ZodDiscriminatedUnion<[z.ZodObject<{
            accountEmail: z.ZodNullable<z.ZodString>;
            planLabel: z.ZodNullable<z.ZodString>;
            status: z.ZodLiteral<"ok">;
            windows: z.ZodArray<z.ZodObject<{
                cost: z.ZodOptional<z.ZodObject<{
                    limitUsdCents: z.ZodNumber;
                    usedUsdCents: z.ZodNumber;
                }, z.core.$strip>>;
                label: z.ZodString;
                resetsAt: z.ZodNullable<z.ZodString>;
                usedPercent: z.ZodNumber;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            status: z.ZodLiteral<"not_installed">;
        }, z.core.$strip>, z.ZodObject<{
            status: z.ZodLiteral<"unauthenticated">;
        }, z.core.$strip>, z.ZodObject<{
            status: z.ZodLiteral<"expired">;
        }, z.core.$strip>, z.ZodObject<{
            accountEmail: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            message: z.ZodString;
            planLabel: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            status: z.ZodLiteral<"error">;
        }, z.core.$strip>], "status">;
        cursor: z.ZodDiscriminatedUnion<[z.ZodObject<{
            accountEmail: z.ZodNullable<z.ZodString>;
            planLabel: z.ZodNullable<z.ZodString>;
            status: z.ZodLiteral<"ok">;
            windows: z.ZodArray<z.ZodObject<{
                cost: z.ZodOptional<z.ZodObject<{
                    limitUsdCents: z.ZodNumber;
                    usedUsdCents: z.ZodNumber;
                }, z.core.$strip>>;
                label: z.ZodString;
                resetsAt: z.ZodNullable<z.ZodString>;
                usedPercent: z.ZodNumber;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            status: z.ZodLiteral<"not_installed">;
        }, z.core.$strip>, z.ZodObject<{
            status: z.ZodLiteral<"unauthenticated">;
        }, z.core.$strip>, z.ZodObject<{
            status: z.ZodLiteral<"expired">;
        }, z.core.$strip>, z.ZodObject<{
            accountEmail: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            message: z.ZodString;
            planLabel: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            status: z.ZodLiteral<"error">;
        }, z.core.$strip>], "status">;
    }, z.core.$strip>, "onlineRpc", true>;
    "workspace.discover_repos": HostDaemonCommandDescriptor<"workspace.discover_repos", z.ZodObject<{
        limit: z.ZodNumber;
        maxDepth: z.ZodNumber;
        sinceDays: z.ZodNumber;
        type: z.ZodLiteral<"workspace.discover_repos">;
    }, z.core.$strict>, z.ZodObject<{
        repos: z.ZodArray<z.ZodObject<{
            agentSeen: z.ZodBoolean;
            agentSeenAt: z.ZodNullable<z.ZodString>;
            lastActivityAt: z.ZodString;
            name: z.ZodString;
            originUrl: z.ZodNullable<z.ZodString>;
            path: z.ZodString;
        }, z.core.$strict>>;
        truncated: z.ZodBoolean;
    }, z.core.$strict>, "onlineRpc", true>;
    "usage.history.scan": HostDaemonCommandDescriptor<"usage.history.scan", z.ZodObject<{
        fileCursors: z.ZodArray<z.ZodObject<{
            byteOffset: z.ZodNumber;
            mtimeMs: z.ZodNumber;
            path: z.ZodString;
        }, z.core.$strict>>;
        limit: z.ZodNumber;
        sinceDays: z.ZodNullable<z.ZodNumber>;
        type: z.ZodLiteral<"usage.history.scan">;
    }, z.core.$strict>, z.ZodObject<{
        events: z.ZodArray<z.ZodObject<{
            cacheWriteTokens: z.ZodNumber;
            cachedInputTokens: z.ZodNumber;
            costSource: z.ZodEnum<{
                "model-priced": "model-priced";
                "provider-reported": "provider-reported";
                unpriced: "unpriced";
            }>;
            costUsdMicros: z.ZodNullable<z.ZodNumber>;
            id: z.ZodString;
            inputTokens: z.ZodNumber;
            model: z.ZodString;
            occurredAt: z.ZodString;
            outputTokens: z.ZodNumber;
            provider: z.ZodEnum<{
                "claude-code": "claude-code";
                cursor: "cursor";
            }>;
            reasoningOutputTokens: z.ZodNumber;
            source: z.ZodEnum<{
                "claude-jsonl": "claude-jsonl";
                "cursor-agent-acp": "cursor-agent-acp";
                "cursor-ide-composer": "cursor-ide-composer";
            }>;
        }, z.core.$strict>>;
        fileCursors: z.ZodArray<z.ZodObject<{
            byteOffset: z.ZodNumber;
            mtimeMs: z.ZodNumber;
            path: z.ZodString;
        }, z.core.$strict>>;
        scannedAt: z.ZodString;
        truncated: z.ZodBoolean;
    }, z.core.$strict>, "onlineRpc", true>;
    "provider_cli.status": HostDaemonCommandDescriptor<"provider_cli.status", z.ZodObject<{
        type: z.ZodLiteral<"provider_cli.status">;
    }, z.core.$strict>, z.ZodRecord<z.ZodEnum<{
        claudeCode: "claudeCode";
        codex: "codex";
        cursor: "cursor";
    }>, z.ZodObject<{
        currentVersion: z.ZodNullable<z.ZodString>;
        displayName: z.ZodString;
        executableName: z.ZodString;
        executablePath: z.ZodNullable<z.ZodString>;
        installAction: z.ZodNullable<z.ZodObject<{
            command: z.ZodString;
            commandKind: z.ZodEnum<{
                exec: "exec";
                shell: "shell";
            }>;
            kind: z.ZodEnum<{
                install: "install";
                update: "update";
            }>;
            label: z.ZodEnum<{
                Install: "Install";
                Update: "Update";
            }>;
        }, z.core.$strip>>;
        installSource: z.ZodEnum<{
            external: "external";
            notInstalled: "notInstalled";
            npmGlobal: "npmGlobal";
        }>;
        installed: z.ZodBoolean;
        latestVersion: z.ZodNullable<z.ZodString>;
        minimumSupportedVersion: z.ZodNullable<z.ZodString>;
        needsUpdate: z.ZodBoolean;
        npmGlobalPackageVersion: z.ZodNullable<z.ZodString>;
        npmPackageName: z.ZodNullable<z.ZodString>;
        versionUnsupported: z.ZodBoolean;
    }, z.core.$strip>>, "onlineRpc", true>;
    "provider_cli.install": HostDaemonCommandDescriptor<"provider_cli.install", z.ZodObject<{
        actionKind: z.ZodEnum<{
            install: "install";
            update: "update";
        }>;
        provider: z.ZodEnum<{
            claudeCode: "claudeCode";
            codex: "codex";
            cursor: "cursor";
        }>;
        type: z.ZodLiteral<"provider_cli.install">;
    }, z.core.$strict>, z.ZodObject<{
        events: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            command: z.ZodString;
            provider: z.ZodEnum<{
                claudeCode: "claudeCode";
                codex: "codex";
                cursor: "cursor";
            }>;
            type: z.ZodLiteral<"started">;
        }, z.core.$strip>, z.ZodObject<{
            provider: z.ZodEnum<{
                claudeCode: "claudeCode";
                codex: "codex";
                cursor: "cursor";
            }>;
            stream: z.ZodEnum<{
                stderr: "stderr";
                stdout: "stdout";
            }>;
            text: z.ZodString;
            type: z.ZodLiteral<"output">;
        }, z.core.$strip>, z.ZodObject<{
            exitCode: z.ZodNullable<z.ZodNumber>;
            provider: z.ZodEnum<{
                claudeCode: "claudeCode";
                codex: "codex";
                cursor: "cursor";
            }>;
            signal: z.ZodNullable<z.ZodString>;
            success: z.ZodBoolean;
            type: z.ZodLiteral<"completed">;
        }, z.core.$strip>, z.ZodObject<{
            message: z.ZodString;
            provider: z.ZodEnum<{
                claudeCode: "claudeCode";
                codex: "codex";
                cursor: "cursor";
            }>;
            type: z.ZodLiteral<"error">;
        }, z.core.$strip>], "type">>;
    }, z.core.$strict>, "onlineRpc", false>;
    "workspace.status": HostDaemonCommandDescriptor<"workspace.status", z.ZodObject<{
        environmentId: z.ZodString;
        maxUntrackedLineStatBytes: z.ZodNumber;
        maxUntrackedLineStatFiles: z.ZodNumber;
        mergeBaseBranch: z.ZodOptional<z.ZodString>;
        type: z.ZodLiteral<"workspace.status">;
        workspaceContext: z.ZodObject<{
            workspacePath: z.ZodString;
            workspaceProvisionType: z.ZodEnum<{
                "managed-worktree": "managed-worktree";
                personal: "personal";
                unmanaged: "unmanaged";
            }>;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        outcome: z.ZodLiteral<"available">;
        workspaceStatus: z.ZodObject<{
            branch: z.ZodObject<{
                currentBranch: z.ZodNullable<z.ZodString>;
                defaultBranch: z.ZodString;
            }, z.core.$strip>;
            checkout: z.ZodDiscriminatedUnion<[z.ZodObject<{
                branchName: z.ZodString;
                headSha: z.ZodNullable<z.ZodString>;
                kind: z.ZodLiteral<"branch">;
            }, z.core.$strip>, z.ZodObject<{
                headSha: z.ZodNullable<z.ZodString>;
                kind: z.ZodLiteral<"detached">;
            }, z.core.$strip>, z.ZodObject<{
                branchName: z.ZodNullable<z.ZodString>;
                kind: z.ZodLiteral<"unborn">;
            }, z.core.$strip>, z.ZodObject<{
                kind: z.ZodLiteral<"unknown">;
                reason: z.ZodString;
            }, z.core.$strip>], "kind">;
            mergeBase: z.ZodNullable<z.ZodObject<{
                aheadCount: z.ZodNumber;
                baseRef: z.ZodNullable<z.ZodString>;
                behindCount: z.ZodNumber;
                commits: z.ZodArray<z.ZodObject<{
                    authorName: z.ZodString;
                    authoredAt: z.ZodNumber;
                    sha: z.ZodString;
                    shortSha: z.ZodString;
                    subject: z.ZodString;
                }, z.core.$strip>>;
                deletions: z.ZodNumber;
                files: z.ZodArray<z.ZodObject<{
                    deletions: z.ZodNullable<z.ZodNumber>;
                    insertions: z.ZodNullable<z.ZodNumber>;
                    path: z.ZodString;
                    status: z.ZodEnum<{
                        "?": "?";
                        "??": "??";
                        A: "A";
                        C: "C";
                        D: "D";
                        M: "M";
                        R: "R";
                        U: "U";
                    }>;
                }, z.core.$strip>>;
                hasCommittedUnmergedChanges: z.ZodBoolean;
                insertions: z.ZodNumber;
                lineStatsComplete: z.ZodBoolean;
                mergeBaseBranch: z.ZodString;
            }, z.core.$strip>>;
            workingTree: z.ZodObject<{
                deletions: z.ZodNumber;
                files: z.ZodArray<z.ZodObject<{
                    deletions: z.ZodNullable<z.ZodNumber>;
                    insertions: z.ZodNullable<z.ZodNumber>;
                    path: z.ZodString;
                    status: z.ZodEnum<{
                        "?": "?";
                        "??": "??";
                        A: "A";
                        C: "C";
                        D: "D";
                        M: "M";
                        R: "R";
                        U: "U";
                    }>;
                }, z.core.$strip>>;
                hasUncommittedChanges: z.ZodBoolean;
                insertions: z.ZodNumber;
                lineStatsComplete: z.ZodBoolean;
                state: z.ZodEnum<{
                    clean: "clean";
                    committed_unmerged: "committed_unmerged";
                    dirty_and_committed_unmerged: "dirty_and_committed_unmerged";
                    dirty_uncommitted: "dirty_uncommitted";
                    untracked: "untracked";
                }>;
            }, z.core.$strip>;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodObject<{
        failure: z.ZodObject<{
            code: z.ZodEnum<{
                not_git_repo: "not_git_repo";
                not_worktree: "not_worktree";
                path_not_found: "path_not_found";
                permission_denied: "permission_denied";
                unknown: "unknown";
                unknown_environment: "unknown_environment";
                workspace_type_mismatch: "workspace_type_mismatch";
            }>;
            message: z.ZodString;
            workspacePath: z.ZodString;
        }, z.core.$strict>;
        outcome: z.ZodLiteral<"unavailable">;
    }, z.core.$strict>], "outcome">, "onlineRpc", true>;
    "workspace.diff": HostDaemonCommandDescriptor<"workspace.diff", z.ZodObject<{
        environmentId: z.ZodString;
        maxDiffBytes: z.ZodNumber;
        maxFileListBytes: z.ZodNumber;
        maxUntrackedFiles: z.ZodNumber;
        target: z.ZodDiscriminatedUnion<[z.ZodObject<{
            type: z.ZodLiteral<"uncommitted">;
        }, z.core.$strip>, z.ZodObject<{
            mergeBaseBranch: z.ZodString;
            type: z.ZodLiteral<"branch_committed">;
        }, z.core.$strip>, z.ZodObject<{
            mergeBaseBranch: z.ZodString;
            type: z.ZodLiteral<"all">;
        }, z.core.$strip>, z.ZodObject<{
            sha: z.ZodString;
            type: z.ZodLiteral<"commit">;
        }, z.core.$strip>], "type">;
        type: z.ZodLiteral<"workspace.diff">;
        workspaceContext: z.ZodObject<{
            workspacePath: z.ZodString;
            workspaceProvisionType: z.ZodEnum<{
                "managed-worktree": "managed-worktree";
                personal: "personal";
                unmanaged: "unmanaged";
            }>;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        diff: z.ZodObject<{
            diff: z.ZodString;
            files: z.ZodString;
            mergeBaseRef: z.ZodNullable<z.ZodString>;
            shortstat: z.ZodString;
            truncated: z.ZodBoolean;
        }, z.core.$strip>;
        outcome: z.ZodLiteral<"available">;
    }, z.core.$strict>, z.ZodObject<{
        failure: z.ZodObject<{
            code: z.ZodEnum<{
                not_git_repo: "not_git_repo";
                not_worktree: "not_worktree";
                path_not_found: "path_not_found";
                permission_denied: "permission_denied";
                unknown: "unknown";
                unknown_environment: "unknown_environment";
                workspace_type_mismatch: "workspace_type_mismatch";
            }>;
            message: z.ZodString;
            workspacePath: z.ZodString;
        }, z.core.$strict>;
        outcome: z.ZodLiteral<"unavailable">;
    }, z.core.$strict>], "outcome">, "onlineRpc", true>;
    "workspace.diffFiles": HostDaemonCommandDescriptor<"workspace.diffFiles", z.ZodObject<{
        environmentId: z.ZodString;
        maxFiles: z.ZodNumber;
        target: z.ZodDiscriminatedUnion<[z.ZodObject<{
            type: z.ZodLiteral<"uncommitted">;
        }, z.core.$strip>, z.ZodObject<{
            mergeBaseBranch: z.ZodString;
            type: z.ZodLiteral<"branch_committed">;
        }, z.core.$strip>, z.ZodObject<{
            mergeBaseBranch: z.ZodString;
            type: z.ZodLiteral<"all">;
        }, z.core.$strip>, z.ZodObject<{
            sha: z.ZodString;
            type: z.ZodLiteral<"commit">;
        }, z.core.$strip>], "type">;
        type: z.ZodLiteral<"workspace.diffFiles">;
        workspaceContext: z.ZodObject<{
            workspacePath: z.ZodString;
            workspaceProvisionType: z.ZodEnum<{
                "managed-worktree": "managed-worktree";
                personal: "personal";
                unmanaged: "unmanaged";
            }>;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        files: z.ZodArray<z.ZodObject<{
            additions: z.ZodNumber;
            binary: z.ZodBoolean;
            deletions: z.ZodNumber;
            origin: z.ZodEnum<{
                tracked: "tracked";
                untracked: "untracked";
            }>;
            path: z.ZodString;
            previousPath: z.ZodNullable<z.ZodString>;
            statusLetter: z.ZodEnum<{
                A: "A";
                C: "C";
                D: "D";
                M: "M";
                R: "R";
                T: "T";
            }>;
        }, z.core.$strip>>;
        mergeBaseRef: z.ZodNullable<z.ZodString>;
        outcome: z.ZodLiteral<"available">;
        shortstat: z.ZodString;
        truncated: z.ZodBoolean;
    }, z.core.$strict>, z.ZodObject<{
        failure: z.ZodObject<{
            code: z.ZodEnum<{
                not_git_repo: "not_git_repo";
                not_worktree: "not_worktree";
                path_not_found: "path_not_found";
                permission_denied: "permission_denied";
                unknown: "unknown";
                unknown_environment: "unknown_environment";
                workspace_type_mismatch: "workspace_type_mismatch";
            }>;
            message: z.ZodString;
            workspacePath: z.ZodString;
        }, z.core.$strict>;
        outcome: z.ZodLiteral<"unavailable">;
    }, z.core.$strict>], "outcome">, "onlineRpc", true>;
    "workspace.diffPatch": HostDaemonCommandDescriptor<"workspace.diffPatch", z.ZodObject<{
        environmentId: z.ZodString;
        maxBytesPerFile: z.ZodNumber;
        paths: z.ZodArray<z.ZodString>;
        target: z.ZodDiscriminatedUnion<[z.ZodObject<{
            type: z.ZodLiteral<"uncommitted">;
        }, z.core.$strip>, z.ZodObject<{
            mergeBaseBranch: z.ZodString;
            type: z.ZodLiteral<"branch_committed">;
        }, z.core.$strip>, z.ZodObject<{
            mergeBaseBranch: z.ZodString;
            type: z.ZodLiteral<"all">;
        }, z.core.$strip>, z.ZodObject<{
            sha: z.ZodString;
            type: z.ZodLiteral<"commit">;
        }, z.core.$strip>], "type">;
        type: z.ZodLiteral<"workspace.diffPatch">;
        workspaceContext: z.ZodObject<{
            workspacePath: z.ZodString;
            workspaceProvisionType: z.ZodEnum<{
                "managed-worktree": "managed-worktree";
                personal: "personal";
                unmanaged: "unmanaged";
            }>;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        outcome: z.ZodLiteral<"available">;
        patches: z.ZodArray<z.ZodObject<{
            patch: z.ZodString;
            path: z.ZodString;
            truncated: z.ZodBoolean;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        failure: z.ZodObject<{
            code: z.ZodEnum<{
                not_git_repo: "not_git_repo";
                not_worktree: "not_worktree";
                path_not_found: "path_not_found";
                permission_denied: "permission_denied";
                unknown: "unknown";
                unknown_environment: "unknown_environment";
                workspace_type_mismatch: "workspace_type_mismatch";
            }>;
            message: z.ZodString;
            workspacePath: z.ZodString;
        }, z.core.$strict>;
        outcome: z.ZodLiteral<"unavailable">;
    }, z.core.$strict>], "outcome">, "onlineRpc", true>;
    "workspace.pull_request": HostDaemonCommandDescriptor<"workspace.pull_request", z.ZodObject<{
        environmentId: z.ZodString;
        type: z.ZodLiteral<"workspace.pull_request">;
        workspaceContext: z.ZodObject<{
            workspacePath: z.ZodString;
            workspaceProvisionType: z.ZodEnum<{
                "managed-worktree": "managed-worktree";
                personal: "personal";
                unmanaged: "unmanaged";
            }>;
        }, z.core.$strip>;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        outcome: z.ZodLiteral<"available">;
        pullRequest: z.ZodObject<{
            baseRefName: z.ZodString;
            checks: z.ZodArray<z.ZodObject<{
                conclusion: z.ZodNullable<z.ZodEnum<{
                    action_required: "action_required";
                    cancelled: "cancelled";
                    failure: "failure";
                    neutral: "neutral";
                    skipped: "skipped";
                    stale: "stale";
                    startup_failure: "startup_failure";
                    success: "success";
                    timed_out: "timed_out";
                    unknown: "unknown";
                }>>;
                name: z.ZodString;
                startedAt: z.ZodNullable<z.ZodString>;
                status: z.ZodEnum<{
                    completed: "completed";
                    in_progress: "in_progress";
                    queued: "queued";
                    unknown: "unknown";
                }>;
                url: z.ZodNullable<z.ZodString>;
            }, z.core.$strict>>;
            headRefName: z.ZodString;
            isDraft: z.ZodBoolean;
            mergeStateStatus: z.ZodNullable<z.ZodEnum<{
                BEHIND: "BEHIND";
                BLOCKED: "BLOCKED";
                CLEAN: "CLEAN";
                DIRTY: "DIRTY";
                DRAFT: "DRAFT";
                HAS_HOOKS: "HAS_HOOKS";
                UNKNOWN: "UNKNOWN";
                UNSTABLE: "UNSTABLE";
            }>>;
            mergeable: z.ZodNullable<z.ZodEnum<{
                CONFLICTING: "CONFLICTING";
                MERGEABLE: "MERGEABLE";
                UNKNOWN: "UNKNOWN";
            }>>;
            number: z.ZodNumber;
            reviewDecision: z.ZodNullable<z.ZodEnum<{
                APPROVED: "APPROVED";
                CHANGES_REQUESTED: "CHANGES_REQUESTED";
                REVIEW_REQUIRED: "REVIEW_REQUIRED";
            }>>;
            reviewRequestCount: z.ZodNumber;
            state: z.ZodEnum<{
                CLOSED: "CLOSED";
                MERGED: "MERGED";
                OPEN: "OPEN";
            }>;
            title: z.ZodString;
            updatedAt: z.ZodString;
            url: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>, z.ZodObject<{
        outcome: z.ZodLiteral<"absent">;
    }, z.core.$strict>, z.ZodObject<{
        message: z.ZodString;
        outcome: z.ZodLiteral<"unavailable">;
    }, z.core.$strict>], "outcome">, "onlineRpc", true>;
};
type HostDaemonCommandRegistry = typeof hostDaemonCommandRegistry;
type AnyHostDaemonCommandDescriptor = HostDaemonCommandRegistry[keyof HostDaemonCommandRegistry];
type HostDaemonCommandDescriptorForTransport<Transport extends HostDaemonCommandTransport> = Extract<AnyHostDaemonCommandDescriptor, {
    transport: Transport;
}>;
type HostDaemonRetryableOnlineRpcCommandDescriptor = Extract<HostDaemonCommandDescriptorForTransport<"onlineRpc">, {
    retryable: true;
}>;
type HostDaemonSchemaForTransport<Transport extends HostDaemonCommandTransport> = HostDaemonCommandDescriptorForTransport<Transport>["schema"];
type HostDaemonRetryableOnlineRpcCommandSchema = HostDaemonRetryableOnlineRpcCommandDescriptor["schema"];
type HostDaemonResultSchemaMapForTransport<Transport extends HostDaemonCommandTransport> = {
    [Descriptor in HostDaemonCommandDescriptorForTransport<Transport> as Descriptor["type"]]: Descriptor["resultSchema"];
};
type HostDaemonOnlineRpcResultSchemaMap = HostDaemonResultSchemaMapForTransport<"onlineRpc">;
type HostDaemonOnlineRpcCommand = z.infer<HostDaemonSchemaForTransport<"onlineRpc">>;
type HostDaemonRetryableOnlineRpcCommand = z.infer<HostDaemonRetryableOnlineRpcCommandSchema>;
type HostDaemonOnlineRpcResultByType = {
    [K in keyof HostDaemonOnlineRpcResultSchemaMap]: z.infer<HostDaemonOnlineRpcResultSchemaMap[K]>;
};
type HostDaemonOnlineRpcResultForCommand<TCommand extends HostDaemonOnlineRpcCommand = HostDaemonOnlineRpcCommand> = TCommand extends {
    type: infer TType;
} ? TType extends keyof HostDaemonOnlineRpcResultByType ? HostDaemonOnlineRpcResultByType[TType] : never : never;

type BbSdk = BbPluginApi["sdk"];
/**
 * Recordable `bb.sdk` stand-in for {@link createFakePluginHost}. Every call
 * through the fake is recorded (post plugin-attribution defaulting, so
 * assertions see what the server would receive); calls without a stubbed
 * implementation throw with a message naming the exact path to stub.
 */
/** One recorded `bb.sdk` call. `path` is dot-joined, e.g. "threads.spawn". */
interface FakeSdkCall {
    path: string;
    args: unknown[];
}
/**
 * A stub keeps the real method's parameter types but may return anything —
 * tests usually only build the fields the plugin reads, not the full wire
 * response.
 */
type LooseStub<F> = F extends (...args: infer A) => unknown ? (...args: A) => unknown : never;
/**
 * Stub implementations keyed like `BbSdk`: an object per area with a subset
 * of its methods, or a function for the root-level members (`on`).
 */
type FakeSdkOverrideTree<T> = {
    [K in keyof T]?: T[K] extends (...args: never[]) => unknown ? LooseStub<T[K]> : FakeSdkOverrideTree<T[K]>;
};
type FakeSdkOverrides = FakeSdkOverrideTree<BbSdk>;
interface FakeSdkHarness {
    /** Every `bb.sdk` call in order, including ones whose stub threw. */
    readonly calls: FakeSdkCall[];
    /** Argument lists of the calls to one dot-joined path. */
    callsTo(path: string): unknown[][];
    /** Add or replace one method's implementation after creation. */
    stub(path: string, implementation: (...args: never[]) => unknown): void;
}
declare function createFakeSdk(options: {
    pluginId: string;
    overrides?: FakeSdkOverrides;
}): {
    sdk: BbSdk;
    harness: FakeSdkHarness;
};

/**
 * `createFakePluginHost` — an in-process stand-in for the BB server's plugin
 * runtime (apps/server/src/services/plugins/plugin-api.ts), for unit-testing
 * a plugin's `server.ts` without a server. `bb` satisfies {@link BbPluginApi};
 * `harness` drives and inspects it.
 *
 * Faithful where a plugin can observe it: registration name validation and
 * error messages, the kv 256KB cap, append-only database migrations, settings
 * read/update semantics (including onChange), schema-validated rpc/cli
 * invocation shapes (strict JSON boundaries, exit-code normalization), `threads.spawn`
 * attribution, atomic reload, and dispose order (services aborted, hooks LIFO,
 * database closed, stale handles throw). New tests can keep host inputs,
 * assertions, and shutdown explicit through `harness.behavior`,
 * `harness.inspection`, and `harness.lifecycle`; direct members remain aliases.
 *
 * Deliberately different from the real host:
 * - storage is process-local: kv in a Map, `storage.database()` one shared
 *   better-sqlite3 handle in a temp directory (same data across calls, like
 *   the host's shared file), secret settings alongside plain values (no files).
 * - `bb.sdk` is always bound (no listen gate) and every unstubbed method
 *   throws instead of hitting a server.
 * - http auth modes are recorded but not enforced — signature checks and
 *   token handling inside handlers still run.
 * - background services/schedules never run on timers; `harness.runService`
 *   and `harness.runSchedule` invoke them deterministically.
 */
/** Same shape (and name) the real host throws for stale API handles. */
declare class PluginContextStaleError extends Error {
    constructor(pluginId: string);
}
type FakeLogLevel = "debug" | "error" | "info" | "warn";
interface FakeLogEntry {
    level: FakeLogLevel;
    message: string;
}
interface FakeHttpRouteRecord {
    method: string;
    path: string;
    auth: PluginHttpAuthMode;
    handler: PluginHttpHandler;
}
interface FakeScheduleRecord {
    name: string;
    cron: string;
    fn: () => void | Promise<void>;
}
interface FakeServiceRecord {
    name: string;
    start: (signal: AbortSignal) => void | Promise<void>;
}
interface FakeCliRecord {
    name: string;
    summary: string;
    commands: PluginCliCommandInfo[];
    run: (argv: string[], ctx: PluginCliContext) => PluginCliResult | Promise<PluginCliResult>;
}
interface FakeAgentToolRecord {
    name: string;
    description: string;
    experimentalStatusLabels: PluginAgentToolExperimentalStatusLabels | null;
    instructions: string | null;
    /** JSON-schema object the host would send providers. */
    inputSchema: unknown;
    parse(input: unknown): {
        ok: true;
        value: unknown;
    } | {
        ok: false;
        error: string;
    };
    execute(params: unknown, ctx: PluginAgentToolContext): PluginAgentToolResult | Promise<PluginAgentToolResult>;
}
interface FakeMentionProviderRecord {
    id: string;
    label: string;
    triggers: readonly PluginMentionTrigger[];
    search: (ctx: PluginMentionSearchContext) => PluginMentionItem[] | Promise<PluginMentionItem[]>;
    resolve: (itemId: string) => {
        context: string;
    } | Promise<{
        context: string;
    }>;
}
interface FakeRealtimeSignal {
    channel: string;
    /** JSON-round-tripped, like the WS broadcast; `undefined` → `null`. */
    payload: unknown;
}
interface ExperimentalFakeHostRpcCall {
    method: string;
    input: unknown;
    hostId: string;
    signal?: AbortSignal;
}
/** Everything the plugin registered, exposed raw for assertions. */
interface FakePluginRegistrations {
    settingsDescriptors: PluginSettingDescriptors;
    httpRoutes: FakeHttpRouteRecord[];
    rpcMethods: string[];
    services: FakeServiceRecord[];
    schedules: FakeScheduleRecord[];
    cli: FakeCliRecord | null;
    agentTools: FakeAgentToolRecord[];
    /** Provider from bb.agents.configure, or null when none registered. */
    agentConfigurationProvider: ((context: PluginAgentConfigurationContext) => PluginAgentConfiguration) | null;
    /** Provider from contributeInstructions, or null when none registered. */
    instructionProvider: ((ctx: {
        threadId: string;
        projectId: string;
    }) => string | null) | null;
    threadEventHandlers: Record<PluginThreadEventName, number>;
    mentionProviders: FakeMentionProviderRecord[];
    /** Live provider registrations from `experimental_registerProvider`
     * (normalized declarations, registration order; dispose removes). */
    providerRegistrations: PluginProviderDeclaration[];
}
/** Read-only state for assertions after a plugin registers or handles work. */
interface FakePluginInspectionState {
    readonly pluginId: string;
    /** Every `bb.log` line, in order. */
    readonly logEntries: FakeLogEntry[];
    /** Every `bb.realtime.publish`, payload normalized like the wire. */
    readonly realtimeSignals: FakeRealtimeSignal[];
    /** Every `bb.status.needsConfiguration` message, in order. */
    readonly needsConfigurationMessages: string[];
    /** Recorded `bb.sdk` calls + stub control. */
    readonly sdk: FakeSdkHarness;
    readonly registrations: FakePluginRegistrations;
    readonly sharedPortDeclarations: Array<{
        hostId: string;
        ports: number[];
    }>;
    /** Calls made through bb.hosts.experimental_client, after input validation. */
    readonly experimental_hostRpcCalls: readonly ExperimentalFakeHostRpcCall[];
    readonly pendingInteractions: readonly (PluginInteractionRequest & {
        id: string;
    })[];
}
/** Deterministic inputs that stand in for behavior normally driven by BB. */
interface FakePluginBehaviorDrivers {
    /** Deliver an unexpected host-worker exit to every registered client. */
    experimental_emitHostWorkerExit(hostId: string): Promise<void>;
    /** Deliver a host signal through its registered payload schema. */
    experimental_emitHostSignal(hostId: string, signal: string, payload: unknown): Promise<void>;
    submitInteraction(id: string, value: JsonValue$1): void;
    cancelInteraction(id: string): void;
    /**
     * Apply a settings update the way the host's settings save does:
     * validate against the declared descriptors (`null` unsets), store, and
     * fire `onChange` listeners when effective values changed. Throws on
     * unknown keys or wrong value types.
     */
    setSettings(values: Record<string, PluginSettingValue | null>): Promise<void>;
    /**
     * Invoke a registered rpc method with host semantics: input/output schemas,
     * strict JSON result normalization, and structured failure codes. Rejects
     * with the same message/code/issues the frontend client surfaces.
     */
    callRpc(method: string, input?: unknown): Promise<unknown>;
    /**
     * Invoke the plugin's CLI command with host semantics: the result's
     * exitCode must be a number, stdout/stderr default to "", and a throwing
     * run() becomes `{ exitCode: 1, stderr: "bb <name> failed: …" }`.
     */
    runCli(argv: string[], ctx?: PluginCliContext): Promise<PluginCliExecutionResult>;
    /**
     * Dispatch a request to a registered `bb.http` route (exact method+path
     * match, like the host's V1 router) through a real Hono context. Auth
     * modes are not enforced. A throwing handler yields the host's 500
     * `{ ok: false, error: "plugin route failed: …" }` response.
     */
    fetchHttp(method: string, path: string, init?: RequestInit): Promise<Response>;
    /**
     * Start a registered background service once, deterministically. `done`
     * settles when `start` returns; abort `controller` to signal shutdown.
     * A thrown NeedsConfigurationError (matched by name, like the host) is
     * recorded via needsConfiguration and resolves `done`; other errors
     * reject it.
     */
    runService(name: string): {
        controller: AbortController;
        done: Promise<void>;
    };
    /** Run a registered schedule's function once (no timers, no cron sweep). */
    runSchedule(name: string): Promise<void>;
    /**
     * Deliver a thread lifecycle event to every `bb.events.on` handler. Handlers run
     * sequentially; errors are caught and logged like the host's
     * fire-and-forget dispatch, and returned for assertions.
     */
    emitThreadEvent<E extends PluginThreadEventName>(event: E, payload: PluginThreadEventPayloads[E]): Promise<{
        errors: unknown[];
    }>;
    /**
     * Call a registered agent tool the way a provider tool-call would:
     * arguments go through the tool's parse step (zod-validated for zod
     * registrations; a parse failure throws), then execute. `ctx` fields
     * default to "thread-test"/"project-test" and a fresh signal.
     */
    callAgentTool(name: string, input: unknown, ctx?: Partial<PluginAgentToolContext>): Promise<PluginAgentToolResult>;
    /** Evaluate `bb.agents.configure` with production validation/fail-closed
     * semantics. With no callback, every registered tool/declared test skill is
     * selected. Callback failures are logged and return empty selections. */
    resolveAgentConfiguration(context: PluginAgentConfigurationContext): Promise<{
        tools: FakeAgentToolRecord[];
        skills: string[];
        instructions: string | null;
    }>;
}
/** Reload/shutdown controls, kept separate from behavior and inspection. */
interface FakePluginLifecycleControls {
    /**
     * Load a replacement against the same persisted settings, kv, and database.
     * The current host remains live when the factory throws; on success its
     * services/hooks are disposed and the returned host becomes current.
     */
    reload(factory: (bb: BbPluginApi) => void | Promise<void>): Promise<FakePluginHost>;
    /**
     * Dispose like a host reload/disable: abort services started via
     * runService, run onDispose hooks LIFO (isolated), close database handles,
     * then poison the `bb` handle (further use throws
     * PluginContextStaleError). Idempotent.
     */
    dispose(): Promise<void>;
}
/**
 * Complete fake-host harness. Direct members are retained for compatibility;
 * the named views make intent explicit in new tests.
 */
interface FakePluginHarness extends FakePluginInspectionState, FakePluginBehaviorDrivers, FakePluginLifecycleControls {
    readonly behavior: FakePluginBehaviorDrivers;
    readonly inspection: FakePluginInspectionState;
    readonly lifecycle: FakePluginLifecycleControls;
}
interface CreateFakePluginHostOptions {
    /** Defaults to "test-plugin". */
    pluginId?: string;
    /**
     * Value served by `bb.server.loopbackBaseUrl` (always bound here, like
     * `bb.sdk`). Defaults to "http://127.0.0.1:38886".
     */
    loopbackBaseUrl?: string;
    /**
     * Pre-seeded stored settings values (as if saved before this load) —
     * including secret ones, which the fake keeps in memory instead of
     * files. Values with the wrong type for their descriptor fall back to
     * the descriptor default on read, like the host.
     */
    settings?: Record<string, PluginSettingValue>;
    /** Initial `bb.sdk` stubs; extend later via `harness.sdk.stub`. */
    sdk?: FakeSdkOverrides;
    /** Static manifest skill ids available to configure() in this fake host. */
    agentSkillIds?: readonly string[];
    /** Read-only identities returned by bb.hosts.ensureSharedPortTunnel. */
    sharedPortTunnelIdentities?: Record<string, PluginSharedPortTunnelIdentity>;
    /** Deterministic stand-in for the targeted daemon host entry. */
    experimental_callHostRpc?: (call: ExperimentalFakeHostRpcCall) => unknown | Promise<unknown>;
    /** Handler for bb.hosts.experimental_callRetryableOnlineRpc. */
    callRetryableOnlineRpc?: <TCommand extends HostDaemonRetryableOnlineRpcCommand>(args: {
        hostId: string;
        command: TCommand;
        timeoutMs: number;
    }) => Promise<HostDaemonOnlineRpcResultForCommand<TCommand>>;
}
interface FakePluginHost {
    bb: BbPluginApi;
    harness: FakePluginHarness;
}
declare function createFakePluginHost(options?: CreateFakePluginHostOptions): FakePluginHost;

type ThreadResponse = PluginThreadEventPayloads["thread.created"]["thread"];
/**
 * A complete, deterministic `ThreadResponse` for thread lifecycle event
 * payloads (`harness.emitThreadEvent`). Defaults are the minimal idle
 * thread; override the fields the test cares about. If the contract grows a
 * required field, this builder fails typecheck — update the default here.
 */
declare function makeThreadResponse(overrides?: Partial<ThreadResponse>): ThreadResponse;

export { PluginContextStaleError, createFakePluginHost, createFakeSdk, makeThreadResponse };
export type { CreateFakePluginHostOptions, FakeAgentToolRecord, FakeCliRecord, FakeHttpRouteRecord, FakeLogEntry, FakeLogLevel, FakeMentionProviderRecord, FakePluginBehaviorDrivers, FakePluginHarness, FakePluginHost, FakePluginInspectionState, FakePluginLifecycleControls, FakePluginRegistrations, FakeRealtimeSignal, FakeScheduleRecord, FakeSdkCall, FakeSdkHarness, FakeSdkOverrides, FakeServiceRecord };
