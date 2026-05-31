const REDACTED = "***REDACTED***";

let knownSecretValues: Set<string> = new Set();

export function registerSecretValues(values: string[]): void {
  for (const v of values) {
    if (v && v.length > 0) {
      knownSecretValues.add(v);
    }
  }
}

export function clearSecretValues(): void {
  knownSecretValues = new Set();
}

export function redactString(input: string): string {
  let result = input;
  for (const secret of knownSecretValues) {
    if (secret.length > 3) {
      result = result.replaceAll(secret, REDACTED);
    }
  }
  return result;
}

export function redactJson<T>(data: T): T {
  const serialized = JSON.stringify(data);
  const redacted = redactString(serialized);
  return JSON.parse(redacted);
}
