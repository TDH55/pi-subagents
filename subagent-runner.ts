import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getArtifactPaths } from "./artifacts.js";
import {
	type ArtifactConfig,
	type ArtifactPaths,
	DEFAULT_MAX_OUTPUT,
	type MaxOutputConfig,
	truncateOutput,
} from "./types.js";

interface SubagentStep {
	agent: string;
	task: string;
	cwd?: string;
	model?: string;
	tools?: string[];
	systemPrompt?: string | null;
}

interface SubagentRunConfig {
	id: string;
	steps: SubagentStep[];
	resultPath: string;
	cwd: string;
	placeholder: string;
	taskIndex?: number;
	totalTasks?: number;
	maxOutput?: MaxOutputConfig;
	artifactsDir?: string;
	artifactConfig?: Partial<ArtifactConfig>;
}

interface StepResult {
	agent: string;
	output: string;
	success: boolean;
	artifactPaths?: ArtifactPaths;
	truncated?: boolean;
}

function runSubagent(config: SubagentRunConfig): void {
	const { id, steps, resultPath, cwd, placeholder, taskIndex, totalTasks, maxOutput, artifactsDir, artifactConfig } =
		config;
	let previousOutput = "";
	const results: StepResult[] = [];
	const overallStartTime = Date.now();

	for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
		const step = steps[stepIndex];
		const stepStartTime = Date.now();
		const args = ["-p", "--no-session"];
		if (step.model) args.push("--model", step.model);
		if (step.tools?.length) args.push("--tools", step.tools.join(","));

		let tmpDir: string | null = null;
		if (step.systemPrompt) {
			tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-subagent-"));
			const promptPath = path.join(tmpDir, "prompt.md");
			fs.writeFileSync(promptPath, step.systemPrompt);
			args.push("--append-system-prompt", promptPath);
		}

		const placeholderRegex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
		const task = step.task.replace(placeholderRegex, () => previousOutput);
		args.push(`Task: ${task}`);

		let artifactPaths: ArtifactPaths | undefined;
		if (artifactsDir && artifactConfig?.enabled !== false) {
			const index = taskIndex !== undefined ? taskIndex : steps.length > 1 ? stepIndex : undefined;
			artifactPaths = getArtifactPaths(artifactsDir, id, step.agent, index);
			fs.mkdirSync(artifactsDir, { recursive: true });

			if (artifactConfig?.includeInput !== false) {
				fs.writeFileSync(artifactPaths.inputPath, `# Task for ${step.agent}\n\n${task}`, "utf-8");
			}
		}

		const result = spawnSync("pi", args, {
			cwd: step.cwd ?? cwd,
			encoding: "utf-8",
			maxBuffer: 10 * 1024 * 1024,
		});

		if (tmpDir) {
			try {
				fs.rmSync(tmpDir, { recursive: true });
			} catch {}
		}

		const output = (result.stdout || "").trim();
		previousOutput = output;

		const stepResult: StepResult = {
			agent: step.agent,
			output,
			success: result.status === 0,
			artifactPaths,
		};

		if (artifactPaths && artifactConfig?.enabled !== false) {
			if (artifactConfig?.includeOutput !== false) {
				fs.writeFileSync(artifactPaths.outputPath, output, "utf-8");
			}

			if (artifactConfig?.includeMetadata !== false) {
				fs.writeFileSync(
					artifactPaths.metadataPath,
					JSON.stringify(
						{
							runId: id,
							agent: step.agent,
							task,
							exitCode: result.status,
							durationMs: Date.now() - stepStartTime,
							timestamp: Date.now(),
						},
						null,
						2,
					),
					"utf-8",
				);
			}
		}

		results.push(stepResult);

		if (result.status !== 0) break;
	}

	let summary = results.map((r) => `${r.agent}:\n${r.output}`).join("\n\n");
	let truncated = false;

	if (maxOutput) {
		const config = { ...DEFAULT_MAX_OUTPUT, ...maxOutput };
		const lastArtifactPath = results[results.length - 1]?.artifactPaths?.outputPath;
		const truncResult = truncateOutput(summary, config, lastArtifactPath);
		if (truncResult.truncated) {
			summary = truncResult.text;
			truncated = true;
		}
	}

	const agentName = steps.length === 1 ? steps[0].agent : `chain:${steps.map((s) => s.agent).join("->")}`;
	fs.mkdirSync(path.dirname(resultPath), { recursive: true });
	fs.writeFileSync(
		resultPath,
		JSON.stringify({
			id,
			agent: agentName,
			success: results.every((r) => r.success),
			summary,
			results: results.map((r) => ({
				agent: r.agent,
				output: r.output,
				success: r.success,
				artifactPaths: r.artifactPaths,
				truncated: r.truncated,
			})),
			exitCode: results.every((r) => r.success) ? 0 : 1,
			timestamp: Date.now(),
			durationMs: Date.now() - overallStartTime,
			truncated,
			artifactsDir,
			cwd,
			...(taskIndex !== undefined && { taskIndex }),
			...(totalTasks !== undefined && { totalTasks }),
		}),
	);
}

const configArg = process.argv[2];
if (configArg) {
	try {
		const configJson = fs.readFileSync(configArg, "utf-8");
		const config = JSON.parse(configJson) as SubagentRunConfig;
		try {
			fs.unlinkSync(configArg);
		} catch {}
		runSubagent(config);
	} catch (err) {
		console.error("Subagent runner error:", err);
		process.exit(1);
	}
} else {
	let input = "";
	process.stdin.setEncoding("utf-8");
	process.stdin.on("data", (chunk) => {
		input += chunk;
	});
	process.stdin.on("end", () => {
		try {
			const config = JSON.parse(input) as SubagentRunConfig;
			runSubagent(config);
		} catch (err) {
			console.error("Subagent runner error:", err);
			process.exit(1);
		}
	});
}
