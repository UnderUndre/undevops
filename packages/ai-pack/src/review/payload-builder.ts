import { z } from "zod";

export interface ChangeSet {
  changeDescription: string;
  diff?: string;
  environmentName: string;
  serviceName: string;
  previousDeployment?: {
    id: string;
    title: string;
    finishedAt: string;
  };
  envVarChanges?: EnvVarChange[];
  composeChanges?: ComposeChange[];
}

export interface EnvVarChange {
  key: string;
  action: "added" | "removed" | "changed";
  previousValue?: string;
  newValue?: string;
}

export interface ComposeChange {
  service: string;
  field: string;
  previousValue?: string;
  newValue?: string;
}

export const changeSetSchema = z.object({
  changeDescription: z.string().min(1),
  diff: z.string().optional(),
  environmentName: z.string(),
  serviceName: z.string(),
  previousDeployment: z
    .object({
      id: z.string(),
      title: z.string(),
      finishedAt: z.string(),
    })
    .optional(),
  envVarChanges: z
    .array(
      z.object({
        key: z.string(),
        action: z.enum(["added", "removed", "changed"]),
        previousValue: z.string().optional(),
        newValue: z.string().optional(),
      }),
    )
    .optional(),
  composeChanges: z
    .array(
      z.object({
        service: z.string(),
        field: z.string(),
        previousValue: z.string().optional(),
        newValue: z.string().optional(),
      }),
    )
    .optional(),
});

function detectEnvVarChanges(
  current?: Record<string, string>,
  previous?: Record<string, string>,
): EnvVarChange[] | undefined {
  if (!current && !previous) return undefined;

  const cur = current ?? {};
  const prev = previous ?? {};
  const changes: EnvVarChange[] = [];
  const allKeys = new Set([...Object.keys(cur), ...Object.keys(prev)]);

  for (const key of allKeys) {
    const inCur = key in cur;
    const inPrev = key in prev;

    if (inCur && !inPrev) {
      changes.push({ key, action: "added", newValue: cur[key] });
    } else if (!inCur && inPrev) {
      changes.push({ key, action: "removed", previousValue: prev[key] });
    } else if (cur[key] !== prev[key]) {
      changes.push({
        key,
        action: "changed",
        previousValue: prev[key],
        newValue: cur[key],
      });
    }
  }

  return changes.length > 0 ? changes : undefined;
}

function parseComposeServices(
  yaml: string,
): Map<string, Record<string, string>> {
  const services = new Map<string, Record<string, string>>();
  let currentService: string | null = null;

  for (const line of yaml.split("\n")) {
    const serviceMatch = line.match(/^  (\S+):\s*$/);
    if (serviceMatch) {
      currentService = serviceMatch[1];
      services.set(currentService, {});
      continue;
    }

    if (currentService) {
      const fieldMatch = line.match(/^    (\S+):\s*(.*)$/);
      if (fieldMatch) {
        const fields = services.get(currentService)!;
        fields[fieldMatch[1]] = fieldMatch[2].trim();
      } else if (/^\S/.test(line) && !line.startsWith(" ")) {
        currentService = null;
      }
    }
  }

  return services;
}

function detectComposeChanges(
  current?: string,
  previous?: string,
): ComposeChange[] | undefined {
  if (!current && !previous) return undefined;

  const curServices = parseComposeServices(current ?? "");
  const prevServices = parseComposeServices(previous ?? "");
  const changes: ComposeChange[] = [];
  const allServices = new Set([...curServices.keys(), ...prevServices.keys()]);

  for (const service of allServices) {
    const curFields = curServices.get(service) ?? {};
    const prevFields = prevServices.get(service) ?? {};
    const allFields = new Set([
      ...Object.keys(curFields),
      ...Object.keys(prevFields),
    ]);

    for (const field of allFields) {
      const curVal = curFields[field];
      const prevVal = prevFields[field];

      if (curVal !== undefined && prevVal === undefined) {
        changes.push({ service, field, newValue: curVal });
      } else if (curVal === undefined && prevVal !== undefined) {
        changes.push({ service, field, previousValue: prevVal });
      } else if (curVal !== prevVal) {
        changes.push({
          service,
          field,
          previousValue: prevVal,
          newValue: curVal,
        });
      }
    }
  }

  return changes.length > 0 ? changes : undefined;
}

function buildDescription(input: {
  commitMessage?: string;
  branch?: string;
  envVarChanges?: EnvVarChange[];
  composeChanges?: ComposeChange[];
  environmentName: string;
  serviceName: string;
}): string {
  const parts: string[] = [];

  if (input.commitMessage) {
    parts.push(input.commitMessage);
  }

  if (input.branch) {
    parts.push(`Branch: ${input.branch}`);
  }

  parts.push(`Service: ${input.serviceName}`);
  parts.push(`Environment: ${input.environmentName}`);

  if (input.envVarChanges && input.envVarChanges.length > 0) {
    parts.push(`${input.envVarChanges.length} env var change(s)`);
  }

  if (input.composeChanges && input.composeChanges.length > 0) {
    const services = new Set(input.composeChanges.map((c) => c.service));
    parts.push(`${services.size} compose service(s) affected`);
  }

  return parts.join(" | ");
}

export function buildChangePayload(input: {
  currentEnvVars?: Record<string, string>;
  previousEnvVars?: Record<string, string>;
  currentCompose?: string;
  previousCompose?: string;
  environmentName: string;
  serviceName: string;
  commitMessage?: string;
  branch?: string;
  diff?: string;
  previousDeployment?: { id: string; title: string; finishedAt: string };
}): ChangeSet {
  const envVarChanges = detectEnvVarChanges(
    input.currentEnvVars,
    input.previousEnvVars,
  );
  const composeChanges = detectComposeChanges(
    input.currentCompose,
    input.previousCompose,
  );
  const changeDescription = buildDescription({
    commitMessage: input.commitMessage,
    branch: input.branch,
    envVarChanges,
    composeChanges,
    environmentName: input.environmentName,
    serviceName: input.serviceName,
  });

  const result: ChangeSet = {
    changeDescription,
    environmentName: input.environmentName,
    serviceName: input.serviceName,
  };

  if (input.diff) result.diff = input.diff;
  if (input.previousDeployment)
    result.previousDeployment = input.previousDeployment;
  if (envVarChanges) result.envVarChanges = envVarChanges;
  if (composeChanges) result.composeChanges = composeChanges;

  return changeSetSchema.parse(result);
}
