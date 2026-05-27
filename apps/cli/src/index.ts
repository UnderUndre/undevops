#!/usr/bin/env node
import { Command } from "commander";
import { serverCommand } from "./commands/server.js";
import { projectCommand } from "./commands/project.js";
import { deployCommand, deploymentCommand } from "./commands/deploy.js";
import { secretCommand } from "./commands/secret.js";
import { envCommand } from "./commands/env.js";

const program = new Command();

program
	.name("undevops")
	.description("undevops — AI-Native Self-Hosted Deployment Platform CLI")
	.version("0.1.0");

program.addCommand(serverCommand);
program.addCommand(projectCommand);
program.addCommand(deployCommand);
program.addCommand(deploymentCommand);
program.addCommand(secretCommand);
program.addCommand(envCommand);

program.parse();
