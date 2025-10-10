# RyCode-Ext Project Context

> **Generated:** 2025-10-10
> **For:** New AI sessions and developer onboarding
> **Purpose:** Comprehensive project understanding package

---

## 🎯 Project Overview

**RyCode-Ext** (formerly Roo-Cline) is an AI-powered development team extension for VS Code and Cursor. It provides multi-modal AI assistance directly in your editor with support for code generation, refactoring, debugging, documentation, and autonomous task execution.

### Key Value Propositions

- **Multi-Mode Adaptability**: Code, Architect, Ask, Debug, and Custom Modes
- **Autonomous Task Execution**: AI agents can read, write, edit files and execute commands
- **MCP Server Integration**: Model Context Protocol support for extensibility
- **Multi-Provider Support**: OpenAI, Anthropic, Gemini, local models (Ollama, LM Studio)
- **Rich Context Management**: Codebase indexing, file mentions, git integration
- **Production-Ready Features**: Checkpoints, auto-approval, task history, telemetry

### Technology Stack

- **Extension Host**: TypeScript + VS Code Extension API
- **Webview UI**: React 18 + Vite + TailwindCSS
- **Build System**: Turbo (monorepo) + pnpm workspaces
- **Testing**: Vitest (57+ test files)
- **State Management**: React Context + ExtensionState
- **Communication**: Message-passing (ExtensionMessage/WebviewMessage)
- **Evaluation System**: Docker-based distributed eval platform

---

## 📁 Project Structure

```
RyCode-Ext/
├── apps/                          # Application packages
│   ├── vscode-e2e/               # E2E test suite
│   ├── vscode-nightly/           # Nightly build configuration
│   ├── web-evals/                # Evaluation web dashboard
│   └── web-rycode-ext/           # Future web version
├── packages/                      # Shared packages
│   ├── build/                    # Build configuration
│   ├── cloud/                    # Cloud API integration
│   ├── config-eslint/            # Shared ESLint config
│   ├── config-typescript/        # Shared TypeScript config
│   ├── evals/                    # Evaluation framework
│   ├── ipc/                      # Inter-process communication
│   ├── telemetry/                # Telemetry services
│   └── types/                    # Shared TypeScript types (@rycode-ext/types)
├── src/                          # Extension source code
│   ├── activate/                 # Extension activation logic
│   ├── api/                      # API provider implementations
│   ├── core/                     # Core business logic
│   │   ├── assistant-message/    # Parse/present AI responses
│   │   ├── checkpoints/          # Git-based checkpointing
│   │   ├── condense/             # Context condensation
│   │   ├── config/               # Configuration management
│   │   ├── context/              # Context tracking
│   │   ├── diff/                 # Diff application strategies
│   │   ├── ignore/               # .rycodeextignore controller
│   │   ├── mentions/             # @file mention processing
│   │   ├── prompts/              # System prompt generation
│   │   ├── protect/              # Protected files controller
│   │   ├── sliding-window/       # Token window management
│   │   ├── task/                 # Task orchestration
│   │   ├── task-persistence/     # Task state management
│   │   ├── tools/                # AI tool implementations
│   │   └── webview/              # Webview message handlers
│   ├── extension/                # Extension entry points
│   ├── integrations/             # External integrations
│   ├── services/                 # Business services
│   ├── shared/                   # Shared types/utilities
│   └── utils/                    # Utility functions
├── webview-ui/                   # React webview application
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── chat/            # Chat interface
│   │   │   ├── cloud/           # Cloud features
│   │   │   ├── common/          # Shared components
│   │   │   ├── history/         # Task history
│   │   │   ├── marketplace/     # Extension marketplace
│   │   │   ├── mcp/             # MCP server management
│   │   │   ├── modes/           # Mode selector
│   │   │   ├── settings/        # Settings panels
│   │   │   └── welcome/         # Welcome screen
│   │   ├── context/             # React Context providers
│   │   ├── hooks/               # Custom React hooks
│   │   ├── i18n/                # Internationalization
│   │   └── utils/               # UI utilities
│   └── public/                   # Static assets
├── locales/                      # 17 language translations
├── scripts/                      # Build and automation scripts
└── .claude/                      # Claude Code slash commands

Total: ~85,000 lines of code
```

---

## 🏗️ Architecture Patterns

### 1. Extension-Webview Architecture

**Communication Pattern**: Message-passing between extension host and webview

```typescript
// Extension → Webview
interface ExtensionMessage {
  type: "state" | "action" | "invoke" | "mcpServers" | ...
  state?: ExtensionState
  action?: "chatButtonClicked" | "settingsButtonClicked" | ...
  payload?: any
}

// Webview → Extension
interface WebviewMessage {
  type: "newTask" | "askResponse" | "saveApiConfiguration" | ...
  text?: string
  images?: string[]
  apiConfiguration?: ProviderSettings
  ...
}
```

**Key Components**:

- `ClineProvider` (src/core/webview/webviewMessageHandler.ts): Main extension controller
- `ExtensionStateContext` (webview-ui/src/context/ExtensionStateContext.tsx): Webview state manager

### 2. Task Lifecycle Management

**Task States**: pending → running → completed/failed/cancelled

**Core Components**:

- `Cline` (src/core/task/index.ts): Task orchestration engine
- Task persistence (src/core/task-persistence/): State/message storage
- Checkpoints (src/core/checkpoints/): Git-based snapshots

**Auto-Approval System**:

```typescript
interface AutoApprovalHandler {
	shouldAutoApprove(tool: string, params: any): boolean
	getApprovalSettings(): AutoApprovalSettings
}
```

### 3. AI Tool System

**Tool Pattern**: Each tool implements a standard interface

```typescript
interface ToolImplementation {
	execute(params: ToolParams): Promise<ToolResult>
	validate(params: ToolParams): ValidationResult
	shouldAutoApprove?(settings: Settings): boolean
}
```

**Available Tools** (src/core/tools/):

- `readFileTool`: Read file contents with line limits
- `writeToFileTool`: Create/overwrite files
- `applyDiffTool`: Apply unified diffs
- `multiApplyDiffTool`: Batch diff application
- `searchFilesTool`: Regex search across files
- `searchAndReplaceTool`: Find/replace operations
- `executeCommandTool`: Run terminal commands
- `listFilesTool`: Directory listings
- `listCodeDefinitionNamesTool`: LSP-based symbol extraction
- `codebaseSearchTool`: Semantic search (when indexing enabled)
- `browserActionTool`: Browser automation
- `useMcpToolTool`: MCP tool invocation
- `accessMcpResourceTool`: MCP resource access
- `attemptCompletionTool`: Task completion
- `askFollowupQuestionTool`: User interaction
- `updateTodoListTool`: Todo management
- `switchModeTool`: Mode switching
- `newTaskTool`: Subtask creation

### 4. Context Management

**Sliding Window Strategy** (src/core/sliding-window/):

- Manages token budget across conversation history
- Prioritizes recent messages and important context
- Drops old messages when approaching token limits

**Context Sources**:

- System prompt (mode-specific + custom instructions)
- Conversation history (with sliding window)
- File mentions (@file.ts)
- Open editor tabs
- Current working directory
- Git status/commits
- Diagnostic messages (errors/warnings)
- Codebase index results
- MCP resources

**Auto-Condensation**:

- Triggered when context exceeds threshold (default: 80%)
- Uses separate condensing model
- Summarizes conversation while preserving key details

### 5. Mode System

**Built-in Modes** (src/shared/modes.ts):

```typescript
type Mode = "code" | "architect" | "ask" | "debug"
```

**Custom Modes**:

- User-defined modes with custom prompts
- Per-mode API configuration
- Tool enable/disable flags
- Support prompt templates

**Mode Configuration**:

```typescript
interface ModeConfig {
	slug: string
	name: string
	roleDefinition: string
	customInstructions: string
	tools: Record<string, boolean>
	apiConfigId?: string
}
```

### 6. Diff Application Strategies

**Multi-Strategy Approach** (src/core/diff/):

1. **Unified Diff**: Standard git-style diffs
2. **Multi-File Search-Replace**: Batch find/replace across files
3. **Insert Groups**: Structured insertions at line positions

**Fuzzy Matching**: Configurable threshold (0.0-1.0) for inexact matches

### 7. Provider Abstraction

**API Providers** (src/api/providers/):

- Anthropic (Claude)
- OpenAI (GPT-4, GPT-3.5)
- Google Gemini
- OpenRouter
- AWS Bedrock
- Azure OpenAI
- Ollama (local)
- LM Studio (local)
- VS Code LM API
- OpenAI-compatible endpoints

**Provider Interface**:

```typescript
interface ApiHandler {
	createMessage(systemPrompt: string, messages: Message[]): Promise<Response>
	getModel(): ModelInfo
	completePrompt(prompt: string): Promise<string>
}
```

---

## 🔌 Key Integrations

### Model Context Protocol (MCP)

**Purpose**: Extensibility via standardized server protocol

**Features**:

- Tool registration from MCP servers
- Resource access (files, URLs, databases)
- Per-server enable/disable
- Timeout configuration
- Auto-restart on crash

**MCP Server Management** (src/services/mcp/):

- Discovery from VS Code settings
- Connection lifecycle management
- Tool/resource introspection
- Error handling and reconnection

### Git Integration

**Capabilities**:

- Checkpoint creation (git stash-based)
- Diff preview
- Checkpoint restoration
- Commit search
- Git status in context

**Implementation**: src/utils/git.ts

### Terminal Integration

**Features**:

- Command execution with output capture
- Shell integration (bash, zsh, powershell, fish)
- Output streaming
- Line/character limits
- Progress bar compression

**Implementation**: src/integrations/terminal/

### Browser Automation

**Actions**:

- launch, click, hover, type
- scroll_up, scroll_down
- resize, close

**Modes**:

- Local browser (via CDP)
- Remote browser (Browserbase/BrowserCloud)

**Implementation**: src/integrations/browser/

### Codebase Indexing

**Architecture**:

- Vector database: Qdrant
- Embedding providers: OpenAI, Ollama, OpenAI-compatible, Gemini, Mistral, Vercel AI Gateway
- Incremental indexing
- Multi-workspace support

**Search**:

- Semantic similarity search
- Configurable max results (default: 3)
- Configurable min score (default: 0.7)

---

## 🎨 UI/UX Design System

### Matrix Theme

**Inspiration**: Terminal-first aesthetic inspired by toolkit-cli.com and The Matrix

**Color Palette**:

```css
--matrix-green-primary: #00ff00 --claude-blue: #7aa2f7 --gemini-green: #9ece6a --codex-magenta: #bb9af7
	--qwen-cyan: #00ffff;
```

**Components** (webview-ui/src/components/common/):

- `MatrixBackground`: Floating orbs + scanlines
- `MatrixAsciiArt`: RyCodeLogo, TerminalPrompt, StatusIcon
- `MatrixChatStyles`: MessageContainer, CodeBlock, Thinking indicator
- `MatrixScrollbar`: Custom scrollbar styling

**Effects**:

- Cursor blink animation
- Glow pulse
- Gradient shift
- Floating orb motion
- Scanline sweep

**Accessibility**:

- Respects `prefers-reduced-motion`
- WCAG AAA contrast compliance
- Screen reader compatibility
- Keyboard navigation support

### Component Architecture

**View Components**:

- `ChatView`: Main chat interface with message history
- `SettingsView`: API configuration, auto-approval, preferences
- `HistoryView`: Task history browser
- `McpView`: MCP server management
- `ModesView`: Mode selector and custom mode editor
- `MarketplaceView`: Extension marketplace
- `CloudView`: Cloud features (Roomote Control, task sync)
- `WelcomeView`: Onboarding and feature showcase

**Performance**:

- React virtualization (react-virtuoso) for large lists
- LRU cache for message visibility tracking
- Memoization (useCallback/useMemo)
- Code splitting (planned)

---

## 🧪 Evaluation System

**Purpose**: Distributed AI evaluation platform for coding tasks

**Architecture** (packages/evals/ARCHITECTURE.md):

```
Web Dashboard → Controller Container → Runner Containers (1-25 parallel)
                      ↓                        ↓
                  PostgreSQL ←→ Redis PubSub
```

**Components**:

1. **Web Dashboard** (Next.js):

    - Run configuration
    - Real-time monitoring (SSE)
    - Results visualization

2. **Controller Container**:

    - Task queue (p-queue, in-memory)
    - Runner orchestration
    - Heartbeat monitoring
    - Result aggregation

3. **Runner Containers**:
    - Isolated VS Code instances
    - Pre-installed language runtimes (Go, Java, JS, Python, Rust)
    - Task execution + unit testing
    - Metrics collection

**Isolation Benefits**:

- Fresh environment per task
- Memory reset on completion
- Parallel execution
- Fault isolation

**Metrics Tracked**:

- Token usage (input/output/cache)
- API costs
- Tool usage frequency
- Execution time
- Success/failure rates

---

## 📋 API Specifications

### ExtensionState (Primary State Object)

**Location**: src/shared/ExtensionMessage.ts

**Key Fields**:

```typescript
interface ExtensionState {
	// Configuration
	version: string
	currentApiConfigName: string
	apiConfiguration: ProviderSettings
	mode: Mode
	customModes: ModeConfig[]

	// Task State
	clineMessages: ClineMessage[]
	currentTaskItem?: HistoryItem
	currentTaskTodos?: TodoItem[]
	taskHistory: HistoryItem[]

	// Settings
	customInstructions: string
	autoApprovalEnabled: boolean
	alwaysAllowReadOnly: boolean
	alwaysAllowWrite: boolean
	alwaysAllowExecute: boolean
	// ... (50+ more settings)

	// Context
	maxOpenTabsContext: number
	maxWorkspaceFiles: number
	maxReadFileLine: number

	// Features
	mcpEnabled: boolean
	browserToolEnabled: boolean
	diffEnabled: boolean
	enableCheckpoints: boolean

	// Cloud
	cloudUserInfo: CloudUserInfo | null
	cloudIsAuthenticated: boolean
	organizationAllowList: OrganizationAllowList

	// UI State
	renderContext: "sidebar" | "editor"
	historyPreviewCollapsed?: boolean
}
```

### ProviderSettings (API Configuration)

**Location**: @rycode-ext/types

```typescript
interface ProviderSettings {
  apiProvider: "anthropic" | "openai" | "gemini" | "openrouter" | ...
  apiModelId: string
  apiKey?: string // Encrypted at rest
  openRouterModelId?: string
  openRouterModelInfo?: ModelInfo
  azureApiVersion?: string
  // ... provider-specific fields
}
```

### ClineMessage (Conversation History)

```typescript
interface ClineMessage {
  ts: number // Timestamp
  type: "say" | "ask"
  say?: "text" | "tool" | "user_feedback" | "api_req_started" | ...
  text?: string
  images?: string[] // Base64 data URIs
  ask?: "completion_result" | "followup" | "tool" | ...
  // ... 20+ more fields for different message types
}
```

### HistoryItem (Task Metadata)

```typescript
interface HistoryItem {
	id: string
	ts: number
	task: string
	tokensIn: number
	tokensOut: number
	cacheWrites?: number
	cacheReads?: number
	totalCost: number
}
```

### TodoItem (Task Todos)

```typescript
interface TodoItem {
	id: string
	description: string
	completed: boolean
	createdAt: number
}
```

---

## 🔐 Security & Production Readiness

### Security Audit (SECURITY_AUDIT.md)

**Completed**:

- CSP headers configured
- Mermaid/Shiki rendering sanitized
- React XSS protections
- API key encryption (extension storage)

**Blockers** (PRODUCTION_READINESS.md):

- [ ] Audit remaining innerHTML usage
- [ ] Image upload validation (size limits, format checks)
- [ ] Command validation in extension backend
- [ ] Sensitive data scrubbing in error logs

### Error Handling

**Error Boundaries**:

- Root boundary in ChatView
- Needed: SettingsView, HistoryView, McpView

**Production Logging**:

- [ ] Strip sensitive console.error() calls
- [ ] Sanitize stack traces
- [ ] Backend error reporting with PII scrubbing

### Testing

**Current**:

- 57+ Vitest unit test files
- Component tests with Testing Library
- Critical path coverage

**Needed**:

- E2E tests (Playwright)
- Accessibility testing (WCAG 2.1 AA)
- Visual regression testing
- Performance benchmarking

### Performance

**Implemented**:

- React virtualization
- LRU caching
- Memoization

**Planned**:

- Code splitting
- Bundle size limits (<1.5MB gzipped)
- Dynamic imports for heavy libraries
- Lazy loading Matrix effects

---

## 🚀 Development Workflows

### Local Development

```bash
# Install dependencies
pnpm install

# Run extension in debug mode (F5 in VS Code)
# Hot reload enabled for webview and extension

# Build VSIX package
pnpm vsix

# Install VSIX with automated script
pnpm install:vsix [-y] [--editor=code|cursor|code-insiders]

# Run tests
pnpm test

# Type checking
pnpm check-types

# Linting
pnpm lint
```

### Monorepo Structure

**Tool**: Turbo (turborepo)

**Workspaces**:

- `apps/*`
- `packages/*`
- Root extension code (src/, webview-ui/)

**Shared Configs**:

- `@rycode-ext/config-typescript`
- `@rycode-ext/config-eslint`

### Version Management

**Tool**: Changesets

**Workflow**:

1. Create changeset: `pnpm changeset`
2. Version bump: `pnpm changeset:version`
3. Publish: Automated via CI/CD

### Internationalization

**Framework**: react-i18next

**Supported Languages**: 17 languages in `locales/`

**Translation Files**:

- `locales/{lang}/translation.json`
- Fallback: English

---

## 🎯 Key Patterns & Conventions

### 1. Message Passing

**Extension ↔ Webview communication is always asynchronous**:

```typescript
// Extension sends state
provider.postMessageToWebview({
	type: "state",
	state: extensionState,
})

// Webview sends action
vscode.postMessage({
	type: "newTask",
	text: "Help me refactor this code",
	images: [],
})
```

### 2. State Management

**Single source of truth**: `ExtensionState` in extension, replicated to webview

**Update pattern**:

1. Webview sends message
2. Extension updates state
3. Extension broadcasts new state to all webviews

### 3. Tool Execution

**Standard flow**:

1. AI requests tool use
2. Validate parameters
3. Check auto-approval settings
4. If not auto-approved, ask user
5. Execute tool
6. Return result to AI
7. Update task persistence

### 4. Context Building

**Prompt construction** (src/core/webview/generateSystemPrompt.ts):

```typescript
const systemPrompt = [
	baseSystemPrompt,
	modePrompt,
	customInstructions,
	rulesContent,
	toolDescriptions,
	environmentDetails,
	openTabsContext,
	workspaceStructure,
].join("\n\n")
```

### 5. Error Handling

**Graceful degradation**:

- Tool failures don't crash the extension
- MCP server crashes trigger auto-restart
- Network errors retry with exponential backoff
- Invalid diffs fall back to full file rewrites

### 6. File Operations

**Safety checks**:

- `.rycodeextignore` filtering
- Protected files list (package.json, .env, etc.)
- Outside-workspace warnings
- Confirmation for write operations (unless auto-approved)

### 7. Testing

**Test file naming**: `__tests__/<feature>.spec.ts`

**Mocking**: `__mocks__/` directories

**Test structure**:

```typescript
describe("Feature", () => {
	beforeEach(() => {
		/* setup */
	})

	it("should handle success case", () => {
		// Arrange
		// Act
		// Assert
	})

	it("should handle error case", () => {
		/* ... */
	})
})
```

---

## 📚 Important Files Reference

### Configuration

- `package.json`: Extension manifest + scripts
- `tsconfig.json`: TypeScript config (extends @rycode-ext/config-typescript)
- `turbo.json`: Turbo pipeline configuration
- `.vscode/launch.json`: Debug configurations

### Documentation

- `README.md`: User-facing documentation
- `CONTRIBUTING.md`: Contribution guidelines
- `CHANGELOG.md`: Release notes
- `PRODUCTION_READINESS.md`: Production checklist
- `SECURITY_AUDIT.md`: Security assessment
- `packages/evals/ARCHITECTURE.md`: Eval system architecture
- `webview-ui/MATRIX_THEME.md`: Matrix theme guide

### Core Extension Files

- `src/extension/ExtensionProvider.ts`: Extension activation
- `src/core/webview/ClineProvider.ts`: Main provider class
- `src/core/task/index.ts`: Task orchestration (Cline class)
- `src/shared/ExtensionMessage.ts`: Extension → Webview messages
- `src/shared/WebviewMessage.ts`: Webview → Extension messages

### Core UI Files

- `webview-ui/src/App.tsx`: Root React component
- `webview-ui/src/context/ExtensionStateContext.tsx`: State management
- `webview-ui/src/components/chat/ChatView.tsx`: Main chat interface (2037 lines - needs refactoring)

### Slash Commands

- `.claude/commands/*.md`: All slash commands
- Examples: `/help-me`, `/plan`, `/implement`, `/test`, `/debug`, `/ship`

---

## 🔮 Future Roadmap

### Near-Term (from PRODUCTION_READINESS.md)

**P0 Blockers**:

- Complete Matrix theme rollout
- E2E test coverage (>60%)
- Security fixes (image validation, command validation)
- Error boundaries on all views
- Production CSP configuration

**P1 Enhancements**:

- Code splitting and bundle optimization
- Performance monitoring (web-vitals)
- Storybook documentation
- Matrix theme customization UI
- Onboarding tutorial

### Long-Term

**Features**:

- Web version (apps/web-rycode-ext/)
- Advanced analytics dashboard
- A/B testing framework
- Visual regression testing
- Component library npm package

**Quality**:

- Accessibility compliance (WCAG 2.1 AA)
- High-contrast mode support
- Automated dependency scanning
- Privacy policy integration

---

## 🤝 Contributing

See `CONTRIBUTING.md` for guidelines.

**Key Points**:

- Use conventional commits
- Add tests for new features
- Update documentation
- Run `pnpm lint` and `pnpm check-types`
- Create changesets for version bumps

---

## 📞 Resources

- **Documentation**: https://docs.roocode.com
- **GitHub**: https://github.com/RyCodeExtInc/RyCode-Ext
- **Discord**: https://discord.gg/roocode
- **Reddit**: https://www.reddit.com/r/RyCodeExt
- **YouTube**: https://youtube.com/@roocodeyt

---

## 📝 Notes for AI Sessions

### When Starting a New Task

1. **Read this file first** to understand architecture
2. **Check PRODUCTION_READINESS.md** for current priorities
3. **Review recent git commits** for context
4. **Check existing tests** in `__tests__/` directories
5. **Follow established patterns** (see Key Patterns section)

### Common Gotchas

- **ChatView.tsx is too large**: Don't add more to it, refactor first
- **Message passing is async**: Always wait for state updates
- **Extension and webview are separate processes**: No shared memory
- **API keys are encrypted**: Use extension storage, never log them
- **Context budget matters**: Be mindful of token limits
- **Matrix theme is not complete**: Apply to new components consistently

### Best Practices

- **Add tests for new features** (see existing test files for patterns)
- **Use TypeScript strictly** (no `any` types)
- **Follow React best practices** (hooks, memoization, pure components)
- **Internationalize user-facing strings** (use `useTranslation()`)
- **Document complex logic** (JSDoc comments)
- **Update this file** when architecture changes

---

**End of Project Context**

This document should be updated periodically as the project evolves. Last updated: 2025-10-10
