import { Command } from "commander";
import chalk from "chalk";
import { formatOrJson } from "../output.js";

type WorkflowStep = {
  title: string;
  purpose: string;
  commands: string[];
};

type WorkflowDefinition = {
  name: string;
  description: string;
  summary: string;
  steps: WorkflowStep[];
};

const WORKFLOWS: WorkflowDefinition[] = [
  {
    name: "agent-create",
    description:
      "Recommended order of operations before creating and testing an agent.",
    summary:
      "Discover valid providers and voices, inspect or fetch prompts, optionally check phone numbers, then create and validate the agent.",
    steps: [
      {
        title: "Inspect providers",
        purpose:
          "Confirm valid STT, LLM, and TTS provider/model combinations before filling agent flags.",
        commands: ["eigi providers list"],
      },
      {
        title: "Pick a voice",
        purpose:
          "Fetch concrete voice IDs for the provider and language you plan to use.",
        commands: [
          "eigi voices list --provider CARTESIA --language en",
          "eigi voices list --provider ELEVENLABS --language en --gender FEMALE",
        ],
      },
      {
        title: "Review or fetch the prompt",
        purpose:
          "List reusable prompts, fetch the active system instruction, or create one before agent creation.",
        commands: [
          "eigi prompts list",
          "eigi prompts get <PROMPT_NAME>",
          "eigi prompts create --name support_v1 --file ./prompt.txt",
        ],
      },
      {
        title: "Check phone numbers when needed",
        purpose:
          "Inbound agents need an assigned purchased number; outbound agents can usually skip this step.",
        commands: ["eigi mobile-numbers"],
      },
      {
        title: "Create the agent",
        purpose:
          "Create the agent with a referenced prompt or inline prompt content.",
        commands: [
          'eigi agents create --name "Support Bot" --type INBOUND --stt-provider DEEPGRAM --stt-model nova-2 --stt-language en --llm-provider OPENAI --llm-model gpt-4o --tts-provider CARTESIA --tts-model sonic-2 --tts-language en --tts-voice-id <VOICE_ID> --prompt-name support_v1 --first-message "Hello, how can I help you today?"',
        ],
      },
      {
        title: "Validate the agent",
        purpose:
          "Inspect the final config and test the first-message or interactive chat flow.",
        commands: [
          "eigi agents get <AGENT_ID>",
          "eigi chat first-message <AGENT_ID>",
          "eigi chat interactive <AGENT_ID>",
        ],
      },
    ],
  },
  {
    name: "prompt-lifecycle",
    description:
      "Manage prompt creation, retrieval, version history, and reuse by agents.",
    summary:
      "Use this when you want to fetch the current system prompt, inspect history, update it safely, and reuse it in one or more agents.",
    steps: [
      {
        title: "List prompts",
        purpose: "Find the exact prompt name before reading or updating it.",
        commands: ["eigi prompts list", "eigi prompts list --all-versions"],
      },
      {
        title: "Fetch the prompt",
        purpose:
          "Retrieve the latest prompt or a specific version of the system instruction.",
        commands: [
          "eigi prompts get <PROMPT_NAME>",
          "eigi prompts get <PROMPT_NAME> --version 2",
        ],
      },
      {
        title: "Inspect version history",
        purpose:
          "Review previous prompt revisions before changing production behavior.",
        commands: ["eigi prompts versions <PROMPT_NAME>"],
      },
      {
        title: "Create or update from a file",
        purpose:
          "Keep prompts in source control and publish new versions from local files.",
        commands: [
          "eigi prompts create --name support_v1 --file ./prompt.txt",
          "eigi prompts update support_v1 --file ./prompt.txt",
        ],
      },
      {
        title: "Reuse the prompt in agents",
        purpose:
          "Reference the same prompt name from one or more agents instead of duplicating inline content.",
        commands: [
          'eigi agents create --name "Support Bot" --type OUTBOUND --stt-provider DEEPGRAM --stt-model nova-2 --stt-language en --llm-provider OPENAI --llm-model gpt-4o --tts-provider CARTESIA --tts-model sonic-2 --tts-language en --tts-voice-id <VOICE_ID> --prompt-name support_v1',
        ],
      },
    ],
  },
];

function getWorkflow(name: string): WorkflowDefinition | undefined {
  return WORKFLOWS.find((workflow) => workflow.name === name);
}

function printWorkflow(workflow: WorkflowDefinition): void {
  console.log(chalk.bold.blue(`\n${workflow.name}`));
  console.log(`${workflow.description}\n`);
  console.log(chalk.dim(`${workflow.summary}\n`));

  workflow.steps.forEach((step, index) => {
    console.log(chalk.bold(`${index + 1}. ${step.title}`));
    console.log(`   ${step.purpose}`);
    step.commands.forEach((command) => {
      console.log(chalk.cyan(`   $ ${command}`));
    });
    console.log();
  });
}

export function registerWorkflow(program: Command): void {
  const workflow = program
    .command("workflow")
    .description(
      "Show recommended CLI workflows such as prompt review and agent creation.",
    );

  workflow
    .command("list")
    .option("--json", "Output as JSON")
    .description("List available workflow guides.")
    .action((opts) => {
      const data = {
        workflows: WORKFLOWS.map(({ name, description, summary }) => ({
          name,
          description,
          summary,
        })),
      };

      formatOrJson(data, opts.json, (formatted) => {
        const workflows = (formatted.workflows as WorkflowDefinition[]) ?? [];
        if (!workflows.length) {
          console.log("No workflows available.");
          return;
        }

        console.log(chalk.bold("\nAvailable workflows\n"));
        for (const item of workflows) {
          console.log(`${chalk.cyan(item.name)}\n  ${item.description}`);
        }
        console.log("\nRun 'eigi workflow <name>' to see the full sequence.");
      });
    });

  for (const item of WORKFLOWS) {
    workflow
      .command(item.name)
      .option("--json", "Output as JSON")
      .description(item.description)
      .action((opts) => {
        const data = { workflow: item };
        formatOrJson(data, opts.json, (formatted) => {
          printWorkflow(formatted.workflow as WorkflowDefinition);
        });
      });
  }

  workflow
    .command("show")
    .argument("<name>", "Workflow name")
    .option("--json", "Output as JSON")
    .description("Show one workflow guide by name.")
    .action((name: string, opts) => {
      const item = getWorkflow(name);
      if (!item) {
        console.error(
          `Unknown workflow '${name}'. Run 'eigi workflow list' to see supported workflows.`,
        );
        process.exit(1);
      }

      const data = { workflow: item };
      formatOrJson(data, opts.json, (formatted) => {
        printWorkflow(formatted.workflow as WorkflowDefinition);
      });
    });
}
