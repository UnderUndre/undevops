#!/usr/bin/env node
/**
 * @undevops/cli — Headless CLI for undevops
 *
 * Commands:
 *   undevops server list|add|remove    — Server management
 *   undevops project list|create|deploy — Project management
 *   undevops deployment list|logs       — Deployment inspection
 *   undevops secret set|list            — Secret management (list shows keys only)
 *   undevops env set|list|unset         — Environment variables
 *   undevops mcp-tokens create|list|revoke — MCP token management
 *   undevops plugin install|list|enable|disable|remove — Plugin management
 *
 * Flags:
 *   --format json|table|plain  — Output format (default: table)
 */

import { Command } from "commander";
import "dotenv/config";

const program = new Command();

program
  .name("undevops")
  .description("AI-Native Self-Hosted Deployment Platform CLI")
  .version("0.1.0");

program
  .command("server")
  .description("Server management commands")
  .addCommand(new Command("list").description("List all servers"))
  .addCommand(new Command("add").description("Add a new server"))
  .addCommand(new Command("remove").description("Remove a server"));

program
  .command("project")
  .description("Project management commands")
  .addCommand(new Command("list").description("List all projects"))
  .addCommand(new Command("create").description("Create a new project"))
  .addCommand(new Command("deploy").description("Deploy a project"));

program
  .command("deployment")
  .description("Deployment inspection commands")
  .addCommand(new Command("list").description("List deployments"))
  .addCommand(new Command("logs").description("View deployment logs"));

program.parse();
