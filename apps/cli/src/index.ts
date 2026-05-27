#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("undevops")
  .description("undevops — AI-Native Self-Hosted Deployment Platform CLI")
  .version("0.1.0");

program
  .command("server")
  .description("Manage servers")
  .addCommand(
    new Command("list").description("List connected servers").action(() => {
      console.log("server list — not yet implemented");
    })
  )
  .addCommand(
    new Command("add").description("Add a server").action(() => {
      console.log("server add — not yet implemented");
    })
  )
  .addCommand(
    new Command("remove").description("Remove a server").action(() => {
      console.log("server remove — not yet implemented");
    })
  );

program
  .command("project")
  .description("Manage projects")
  .addCommand(
    new Command("list").description("List projects").action(() => {
      console.log("project list — not yet implemented");
    })
  )
  .addCommand(
    new Command("create").description("Create a project").action(() => {
      console.log("project create — not yet implemented");
    })
  )
  .addCommand(
    new Command("deploy").description("Deploy a project").action(() => {
      console.log("project deploy — not yet implemented");
    })
  );

program.parse();
