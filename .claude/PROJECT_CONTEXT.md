# RyCode-Ext Project Context Package

> **Generated:** 2025-10-05
> **Branch:** feature/spec-kit-migration
> **Purpose:** Comprehensive context for AI development sessions

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Recent Changes & Migration Status](#recent-changes--migration-status)
4. [Development Setup](#development-setup)
5. [Key Patterns & Conventions](#key-patterns--conventions)
6. [Mode System](#mode-system)
7. [Core Technologies](#core-technologies)
8. [Package Structure](#package-structure)
9. [Testing Strategy](#testing-strategy)
10. [Important File Locations](#important-file-locations)

---

## Project Overview

**RyCode-Ext** (formerly Roo-Code) is an AI-powered development assistant built as a VS Code extension. It provides intelligent code generation, refactoring, debugging, and documentation capabilities through a sophisticated mode-based system.

### Key Features

- **Mode-Based Interactions**: Code, Architect, Ask, Debug, and Custom Modes
- **Multi-Provider AI Support**: Anthropic, OpenAI, Google, DeepSeek, local models (Ollama, LM Studio)
- **Advanced Tool System**: File operations, terminal execution, MCP server integration
- **Spec-Kit Framework**: Recent migration to specification-driven development
- **Multi-Language Support**: i18n with 17+ language localizations
- **Cloud Integration**: Optional cloud features for team collaboration

### Project Metadata

- **Package Name:** `rycode-ext`
- **License:** Apache 2.0
- **Node Version:** 20.19.2
- **Package Manager:** pnpm 10.8.1
- **Monorepo Tool:** Turbo
- **Primary Language:** TypeScript

---

## Architecture

### High-Level Structure

```
RyCode-Ext/
├── src/                           # Main extension source
│   ├── core/                      # Core functionality
│   │   ├── config/               # Configuration management (modes, settings)
│   │   ├── prompts/              # System prompt generation
│   │   ├── tools/                # AI tool implementations
│   │   ├── task/                 # Task execution engine
│   │   ├── webview/              # Webview provider
│   │   └── ...
│   ├── api/                       # AI provider implementations
│   ├── services/                  # Services (MCP, indexing, cloud)
│   ├── integrations/              # VS Code integrations
│   └── extension.ts               # Entry point
├── webview-ui/                    # React-based UI
├── packages/                      # Shared packages
│   ├── types/                    # TypeScript type definitions
│   ├── cloud/                    # Cloud service integration
│   ├── telemetry/                # Analytics
│   ├── ipc/                      # Inter-process communication
│   └── evals/                    # Evaluation framework
├── apps/                          # Standalone applications
│   ├── web-rycode-ext/           # Marketing website
│   ├── web-evals/                # Evals dashboard
│   └── vscode-e2e/               # E2E tests
├── .rycode-ext/                   # Legacy mode configurations (deprecated)
├── .specify/                      # Spec-Kit framework (current)
│   ├── config.yml                # Mode registry
│   └── memory/                   # Specifications, plans, tasks
│       ├── constitution.md       # Project constitution
│       ├── specifications/       # Feature specs
│       │   └── modes/           # Mode definitions
│       ├── automation/           # Slash commands, triggers
│       ├── plans/                # Implementation plans
│       └── tasks/                # Task breakdowns
└── scripts/                       # Build and utility scripts
```

### Core Components

#### 1. **ClineProvider** (`src/core/webview/ClineProvider.ts`)

- Main orchestrator for extension functionality
- Manages webview lifecycle and message passing
- Coordinates task execution and tool usage

#### 2. **CustomModesManager** (`src/core/config/CustomModesManager.ts`)

- **Recent Migration**: Transitioned to Spec-Kit framework
- Supports both legacy `.rycode-ext` and new `.specify` structures
- Manages mode configurations with YAML parsing
- File watching for hot-reload of mode changes

#### 3. **Tool System** (`src/core/tools/`)

- 15+ tools for file operations, terminal execution, search
- Tool validation and repetition detection
- MCP (Model Context Protocol) integration
- Key tools:
    - `applyDiffTool.ts` - Multi-strategy diff application
    - `executeCommandTool.ts` - Terminal command execution
    - `searchFilesTool.ts` - Codebase search with ripgrep
    - `useMcpToolTool.ts` - External MCP tool invocation

#### 4. **AI Provider Abstraction** (`src/api/providers/`)

- 30+ AI provider implementations
- Standardized interfaces for streaming and message handling
- Support for native and OpenAI-compatible APIs
- Notable providers:
    - `anthropic.ts` - Claude models
    - `openai.ts` - GPT models
    - `gemini.ts` - Google models
    - `rycode-ext.ts` - First-party cloud provider

---

## Recent Changes & Migration Status

### 🚀 Spec-Kit Migration (Current Branch: `feature/spec-kit-migration`)

**Commits:**

- `00a483f8e` - feat: implement Spec-Kit framework with .roo legacy support
- `46c7b3226` - feat: migrate custom modes to Spec-Kit framework
- `50baff43d` - Rebrand from Roo-Code to RyCode-Ext (main branch)

### What Changed

#### 1. **Mode Configuration System**

**Before (.rycode-ext):**

```
.rycode-ext/
├── rules/              # Core rules
├── rules-{mode}/       # Mode-specific XML rules
├── commands/           # Slash commands
└── roomotes.yml        # Automation config
```

**After (.specify):**

```
.specify/
├── config.yml          # Mode registry
└── memory/
    ├── constitution.md          # Project principles
    ├── specifications/modes/    # Mode definitions (Markdown)
    ├── automation/              # Commands & triggers
    ├── plans/                   # Implementation plans
    └── tasks/                   # Actionable tasks
```

#### 2. **Migration Script**

- Located: `scripts/migrate-to-spec-kit.js`
- Converts XML rules to Markdown specifications
- Generates constitution from existing rules
- Preserves all mode configurations
- **Status**: Fully implemented and tested

#### 3. **CustomModesManager Updates**

- Dual support for legacy and new formats
- Priority order: `.specify/config.yml` → workspace `.modes` → global settings
- Backward compatibility maintained
- New test suite: `CustomModesManager.specKit.spec.ts`

#### 4. **File Renames**

- `.roo` → `.rycode-ext` (legacy directory)
- `.roomodes` → `.rycodeextmodes` (legacy config)
- `.rooignore` → `.rycodeextignore` (ignore patterns)
- `RooIgnoreController` → `RyCodeExtIgnoreController`

### Migration Impact

**Modified Files (Key):**

- `src/core/config/CustomModesManager.ts` - Core mode loading logic
- `src/core/prompts/system.ts` - System prompt generation
- All test files updated with new naming
- 440+ files affected by rebrand

**Testing Status:**

- ✅ Legacy `.rycode-ext` support working
- ✅ New `.specify` framework functional
- ✅ Migration script validated
- ✅ All existing tests passing
- ✅ New Spec-Kit tests added

---

## Development Setup

### Prerequisites

```bash
# Required versions
node -v  # 20.19.2
pnpm -v  # 10.8.1
```

### Installation

```bash
# Clone repository
git clone https://github.com/RyCodeExtInc/RyCode-Ext.git
cd RyCode-Ext

# Install dependencies (uses bootstrap script)
pnpm install

# Run in development mode
# Press F5 in VS Code to launch Extension Development Host
```

### Available Commands

```bash
# Development
pnpm build              # Build all packages
pnpm test               # Run test suites
pnpm lint               # Lint codebase
pnpm format             # Format with Prettier
pnpm check-types        # TypeScript type checking

# Building Extension
pnpm bundle             # Create production bundle
pnpm vsix               # Generate .vsix package
pnpm install:vsix       # Build and install locally

# Specialized
pnpm evals              # Run evaluation framework
pnpm clean              # Clean build artifacts
```

### Project Structure (Turbo Monorepo)

- **Workspace:** `pnpm-workspace.yaml` defines packages
- **Caching:** Turbo caches build outputs in `.turbo/`
- **Task Pipeline:** `turbo.json` orchestrates build dependencies

---

## Key Patterns & Conventions

### 1. **TypeScript Standards**

- **Strict Mode:** Enabled across all packages
- **Path Aliases:**
    - `@roo/*` → `src/*` (extension code)
    - `@src/*` → `webview-ui/src/*` (UI code)
    - `@rycode-ext/*` → `packages/*` (shared packages)
- **Type Exports:** All types from `packages/types/src/`

### 2. **Naming Conventions**

- **Files:** `kebab-case.ts` for modules, `PascalCase.ts` for classes
- **Components:** React components use `PascalCase.tsx`
- **Tests:** `*.spec.ts` for unit tests, `*.test.ts` for integration tests
- **Test Location:** `__tests__/` directories co-located with source

### 3. **Code Organization**

```typescript
// Import order (enforced by ESLint)
import * as vscode from "vscode" // External dependencies
import type { ModeConfig } from "@rycode-ext/types" // Type imports
import { helperFunction } from "../utils" // Internal imports
```

### 4. **Error Handling**

- **Graceful Degradation:** Log errors, show user-friendly messages
- **Logging:** Use `logger` from `utils/logging`
- **User Feedback:** `vscode.window.showErrorMessage()` for critical issues

### 5. **Async Patterns**

- **Preferred:** `async/await` over raw Promises
- **Queue Management:** Write queues for file operations (see `CustomModesManager`)
- **Cancellation:** Support VS Code `CancellationToken` where applicable

### 6. **Testing Philosophy**

- **Coverage:** Aim for 80%+ on critical paths
- **Framework:** Vitest for all TypeScript tests
- **Mocking:** Mock VS Code API and file system in tests
- **Integration:** Mocha for E2E tests in `apps/vscode-e2e`

### 7. **i18n (Internationalization)**

```typescript
import { t } from "./i18n"

// Usage
const message = t("errors.fileNotFound", { filename: "example.ts" })
```

- **Locale Files:** `src/i18n/locales/*.json`
- **17 Languages Supported:** en, es, fr, de, ja, zh-CN, etc.

---

## Mode System

### Architecture

Modes define specialized AI behaviors with specific tool access and instructions.

#### Mode Definition Structure

```yaml
# Example from .specify/memory/specifications/modes/test.md
slug: test
name: 🧪 Test
roleDefinition: |
    You are a Vitest testing specialist with expertise in TDD...
whenToUse: Use for writing, modifying, or maintaining tests.
description: Write and maintain tests.
groups:
    - read
    - browser
    - command
    - - edit
      - fileRegex: (__tests__/.*|\.test\.(ts|tsx|js|jsx)$)
        description: Test files and mocks
customInstructions: |
    When writing tests:
    - Use describe/it blocks
    - Include meaningful test descriptions
    ...
```

#### Tool Groups

- **read**: File reading, search, code definitions
- **edit**: File writing and modifications (can be restricted by regex)
- **browser**: Browser automation (when supported)
- **command**: Terminal command execution
- **mcp**: Model Context Protocol server access

### Current Modes (11 total)

1. **🧪 Test** - Vitest test creation and maintenance
2. **🎨 Design Engineer** - UI implementation with React/Tailwind
3. **🌐 Translate** - Localization file management
4. **🔧 Issue Fixer** - GitHub issue resolution
5. **🧪 Integration Tester** - E2E test writing
6. **📚 Docs Extractor** - Documentation analysis
7. **🛠️ PR Fixer** - Pull request feedback resolution
8. **🕵️ Issue Investigator** - GitHub issue analysis
9. **🔀 Merge Resolver** - Merge conflict resolution
10. **📝 Issue Writer** - GitHub issue creation
11. **✍️ Mode Writer** - Custom mode development

### Mode Loading Priority

1. `.specify/config.yml` (Spec-Kit - highest priority)
2. Workspace `.modes` file (legacy)
3. Global settings (stored in extension global state)

---

## Core Technologies

### Frontend (webview-ui/)

- **Framework:** React 18
- **Styling:** Tailwind CSS v4
- **Components:** Shadcn UI
- **Build:** Vite
- **State:** React Context API

### Backend (src/)

- **Runtime:** VS Code Extension API
- **Language:** TypeScript 5.4+
- **Build:** esbuild (via tsup)
- **Testing:** Vitest
- **AI Streaming:** Custom streaming implementation per provider

### Infrastructure

- **Monorepo:** Turborepo
- **Package Manager:** pnpm with workspaces
- **CI/CD:** GitHub Actions
- **Changesets:** For versioning and changelogs

---

## Package Structure

### Published Packages

#### `@rycode-ext/types`

- **Purpose:** Shared TypeScript type definitions
- **Published:** npm (scoped package)
- **Consumers:** All internal packages + external developers
- **Key Exports:**
    - `ModeConfig`, `PromptComponent`, `TodoItem`
    - `ApiConfiguration`, `TaskMessage`
    - Provider-specific types

#### `@rycode-ext/cloud`

- **Purpose:** Cloud service integration
- **Features:**
    - Authentication (OAuth, static tokens)
    - Settings synchronization
    - Telemetry client
    - Bridge orchestrator for remote tasks

#### `@rycode-ext/telemetry`

- **Purpose:** Analytics and usage tracking
- **Implementation:** PostHog integration
- **Privacy:** Respects user consent settings

#### `@rycode-ext/ipc`

- **Purpose:** Inter-process communication
- **Use Case:** Communication between extension and worker processes

### Internal Packages

#### `@rycode-ext/evals`

- **Purpose:** Evaluation framework for measuring AI performance
- **Architecture:** Server/runner split with Docker
- **Database:** Turso (libSQL)
- **Dashboard:** Next.js web app (`apps/web-evals`)

#### `@rycode-ext/build`

- **Purpose:** Shared build utilities and configuration

#### `@rycode-ext/config-*`

- **config-typescript:** Shared tsconfig.json bases
- **config-eslint:** ESLint configurations

---

## Testing Strategy

### Unit Tests (Vitest)

**Location:** `src/**/__tests__/*.spec.ts`

**Key Test Suites:**

- `CustomModesManager.spec.ts` - Mode loading and caching
- `CustomModesManager.specKit.spec.ts` - Spec-Kit integration
- `applyDiffTool.spec.ts` - Diff application strategies
- `executeCommandTool.spec.ts` - Command execution

**Running Tests:**

```bash
pnpm test                    # All tests
pnpm test CustomModesManager # Specific suite
```

### Integration Tests (Mocha)

**Location:** `apps/vscode-e2e/src/suite/`

**Covered Scenarios:**

- Mode switching during tasks
- Tool execution workflows
- Multi-step task flows
- API message validation

**Running E2E:**

```bash
cd apps/vscode-e2e
pnpm test
```

### Evaluation Framework

**Purpose:** Measure real-world AI agent performance

**Exercises:** Defined in `packages/evals/exercises/`

- Code generation tasks
- Refactoring challenges
- Debugging scenarios

**Running Evals:**

```bash
pnpm evals  # Starts Docker environment
```

---

## Important File Locations

### Configuration Files

- **Mode Definitions (Current):** `.specify/memory/specifications/modes/*.md`
- **Mode Registry:** `.specify/config.yml`
- **Legacy Modes:** `.rycodeextmodes` (YAML)
- **Ignore Patterns:** `.rycodeextignore`
- **Extension Manifest:** `src/package.json`

### Core Source Files

- **Extension Entry:** `src/extension.ts`
- **Main Provider:** `src/core/webview/ClineProvider.ts`
- **Mode Manager:** `src/core/config/CustomModesManager.ts`
- **System Prompts:** `src/core/prompts/system.ts`
- **Tool Definitions:** `src/core/tools/*.ts`

### UI Components

- **Main App:** `webview-ui/src/App.tsx`
- **Chat Interface:** `webview-ui/src/components/chat/`
- **Settings:** `webview-ui/src/components/settings/`

### Scripts

- **Migration:** `scripts/migrate-to-spec-kit.js`
- **Build:** `scripts/bootstrap.mjs`
- **VSIX Install:** `scripts/install-vsix.js`

### Documentation

- **README:** `README.md`
- **Contributing:** `CONTRIBUTING.md`
- **Changelog:** `CHANGELOG.md`
- **Constitution:** `.specify/memory/constitution.md` (9600+ lines)

---

## Development Workflow

### Issue-First Contribution

1. Search existing issues or create new one
2. Comment "Claiming" and contact maintainer on Discord
3. Get assigned before starting work
4. Create feature branch from `main`
5. Submit PR linked to issue

### Pull Request Guidelines

- Must reference assigned GitHub issue
- Pass CI tests (lint, type check, tests)
- Include screenshots for UI changes
- Follow roadmap alignment (reliability, UX, performance)

### Code Review Process

- **Daily Triage:** Quick checks by maintainers
- **Weekly Review:** In-depth assessment
- **Iterate Promptly:** Address feedback quickly

---

## Next Steps for New Contributors

### Quick Start Tasks

1. **Setup Environment:**

    ```bash
    pnpm install
    # Press F5 in VS Code
    ```

2. **Explore Modes:**

    - Check `.specify/memory/specifications/modes/`
    - Try switching modes in the extension
    - Read `constitution.md` for project principles

3. **Run Tests:**

    ```bash
    pnpm test
    cd apps/vscode-e2e && pnpm test
    ```

4. **Build Extension:**
    ```bash
    pnpm vsix
    code --install-extension bin/roo-cline-*.vsix
    ```

### Recommended Reading Order

1. `README.md` - Project overview
2. `CONTRIBUTING.md` - Contribution guidelines
3. `.specify/memory/constitution.md` - Project principles
4. `src/core/webview/ClineProvider.ts` - Main orchestration
5. `src/core/config/CustomModesManager.ts` - Mode system

### Community Resources

- **Discord:** https://discord.gg/roocode (contact `hrudolph`)
- **Reddit:** https://www.reddit.com/r/RyCodeExt/
- **YouTube:** https://youtube.com/@roocodeyt
- **Docs:** https://docs.roocode.com

---

## Known Limitations & Future Work

### Current Limitations

- Spec-Kit migration on feature branch (not merged to main yet)
- Legacy `.rycode-ext` directory still present for backward compatibility
- Some documentation references old "Roo-Code" naming
- Constitution.md is very large (9600+ lines) - may need refactoring

### Planned Improvements

- Complete Spec-Kit migration merge
- Remove legacy `.rycode-ext` support after transition period
- Refactor constitution into modular documents
- Enhanced eval coverage for modes
- Performance optimizations for large codebases

---

**This context package is maintained for AI development sessions. For the latest updates, check the git log and recent commits.**
