import { parse } from "toml";
/**
 * Fetches the list of available templates from meta.json
 */
export async function fetchTemplatesList(baseUrl = "https://templates.dokploy.com") {
    const response = await fetch(`${baseUrl}/meta.json`, {
        signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }
    const templates = (await response.json());
    return templates.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        version: template.version,
        logo: template.logo,
        links: template.links,
        tags: template.tags,
    }));
}
/**
 * Fetches a specific template's files
 */
export async function fetchTemplateFiles(templateId, baseUrl = "https://templates.dokploy.com") {
    const timeout = AbortSignal.timeout(10000);
    const [templateYmlResponse, dockerComposeResponse] = await Promise.all([
        fetch(`${baseUrl}/blueprints/${templateId}/template.toml`, {
            signal: timeout,
        }),
        fetch(`${baseUrl}/blueprints/${templateId}/docker-compose.yml`, {
            signal: timeout,
        }),
    ]);
    if (!templateYmlResponse.ok || !dockerComposeResponse.ok) {
        throw new Error("Template files not found");
    }
    const [templateYml, dockerCompose] = await Promise.all([
        templateYmlResponse.text(),
        dockerComposeResponse.text(),
    ]);
    const config = parse(templateYml);
    return { config, dockerCompose };
}
