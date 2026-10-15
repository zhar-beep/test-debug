# Workflow

- Wants a local preview/dev server (localhost) running so changes are visible in real time while iterating on UI. Confidence: 0.7
- After a change, expects the agent to re-verify that all existing functionality still works and that platform/device compatibility is maintained. Confidence: 0.65
- Receptive to extending the project by adopting well-maintained open-source libraries/tools rather than building everything from scratch. Confidence: 0.7
- Wants a written plan / PRD produced before implementing large features or sweeping changes, to assess feasibility first. Confidence: 0.7
- Prefers removed functionality/code to be archived into a dedicated "backup" location rather than deleted outright. Confidence: 0.65
- Wants the agent to ask plenty of clarifying questions up front (rather than guessing/assuming) whenever requirements, images, or intent are ambiguous — explicitly encouraged asking before proceeding with planning, and wants the questions to be numerous and detailed. Confidence: 0.8
- When a required tool/dependency is missing, expects the agent to install it (or offer to install it) rather than merely reporting that it is absent. Confidence: 0.6
- Prefers implementations to be device-agnostic — detect device model/specs at runtime instead of hardcoding the current device — anticipating the project being published for others. Confidence: 0.6
