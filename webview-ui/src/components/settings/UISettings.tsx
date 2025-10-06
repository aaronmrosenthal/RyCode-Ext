import { HTMLAttributes } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { Glasses } from "lucide-react"
import { telemetryClient } from "@/utils/TelemetryClient"

import { SetCachedStateField } from "./types"
import { SectionHeader } from "./SectionHeader"
import { Section } from "./Section"
import { ExtensionStateContextType } from "@/context/ExtensionStateContext"

interface UISettingsProps extends HTMLAttributes<HTMLDivElement> {
	reasoningBlockCollapsed: boolean
	matrixThemeEnabled: boolean
	setCachedStateField: SetCachedStateField<keyof ExtensionStateContextType>
}

export const UISettings = ({
	reasoningBlockCollapsed,
	matrixThemeEnabled,
	setCachedStateField,
	...props
}: UISettingsProps) => {
	const { t } = useAppTranslation()

	const handleReasoningBlockCollapsedChange = (value: boolean) => {
		setCachedStateField("reasoningBlockCollapsed", value)

		// Track telemetry event
		telemetryClient.capture("ui_settings_collapse_thinking_changed", {
			enabled: value,
		})
	}

	const handleMatrixThemeEnabledChange = (value: boolean) => {
		setCachedStateField("matrixThemeEnabled", value)

		// Track telemetry event
		telemetryClient.capture("ui_settings_matrix_theme_changed", {
			enabled: value,
		})
	}

	return (
		<div {...props}>
			<SectionHeader>
				<div className="flex items-center gap-2">
					<Glasses className="w-4" />
					<div>{t("settings:sections.ui")}</div>
				</div>
			</SectionHeader>

			<Section>
				<div className="space-y-6">
					{/* Matrix Theme Toggle */}
					<div className="flex flex-col gap-1">
						<VSCodeCheckbox
							checked={matrixThemeEnabled ?? true}
							onChange={(e: any) => handleMatrixThemeEnabledChange(e.target.checked)}
							data-testid="matrix-theme-checkbox">
							<span className="font-medium">Matrix Theme</span>
						</VSCodeCheckbox>
						<div className="text-vscode-descriptionForeground text-sm ml-5 mt-1">
							Enable toolkit-cli.com inspired terminal aesthetic with animated effects, gradient text, and
							retro styling
						</div>
					</div>

					{/* Collapse Thinking Messages Setting */}
					<div className="flex flex-col gap-1">
						<VSCodeCheckbox
							checked={reasoningBlockCollapsed}
							onChange={(e: any) => handleReasoningBlockCollapsedChange(e.target.checked)}
							data-testid="collapse-thinking-checkbox">
							<span className="font-medium">{t("settings:ui.collapseThinking.label")}</span>
						</VSCodeCheckbox>
						<div className="text-vscode-descriptionForeground text-sm ml-5 mt-1">
							{t("settings:ui.collapseThinking.description")}
						</div>
					</div>
				</div>
			</Section>
		</div>
	)
}
