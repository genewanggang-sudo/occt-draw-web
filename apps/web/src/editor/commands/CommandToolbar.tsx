import {
    commandDefinitions,
    sketchDrawingToolGroups,
    type CommandAvailabilityMap,
    type CommandId,
    type SketchToolDefinition,
    type SketchToolGroupDefinition,
    type SketchToolIcon,
} from '@occt-draw/editor';

interface CommandToolbarProps {
    readonly activeCommandId: CommandId;
    readonly commandAvailability: CommandAvailabilityMap;
    readonly isEditingSketch: boolean;
    readonly onActivateCommand: (commandId: CommandId) => void;
}

export function CommandToolbar({
    activeCommandId,
    commandAvailability,
    isEditingSketch,
    onActivateCommand,
}: CommandToolbarProps) {
    if (isEditingSketch) {
        return (
            <nav className="cad-workbench__command-actions" aria-label="草图绘制工具">
                {sketchDrawingToolGroups.map((group) => (
                    <SketchToolGroup
                        key={group.label}
                        activeCommandId={activeCommandId}
                        commandAvailability={commandAvailability}
                        group={group}
                        onActivateCommand={onActivateCommand}
                    />
                ))}
            </nav>
        );
    }

    return (
        <nav className="cad-workbench__command-actions" aria-label="命令入口">
            {commandDefinitions
                .filter((command) => !command.id.startsWith('sketch-'))
                .map((command) => {
                    const availability = commandAvailability[command.id];

                    return (
                        <button
                            key={command.id}
                            className="cad-workbench__action cad-workbench__action--command"
                            disabled={!availability.enabled}
                            title={availability.reason ?? command.label}
                            type="button"
                            aria-pressed={activeCommandId === command.id}
                            onClick={() => {
                                onActivateCommand(command.id);
                            }}
                        >
                            {command.label}
                        </button>
                    );
                })}
        </nav>
    );
}

function SketchToolGroup({
    activeCommandId,
    commandAvailability,
    group,
    onActivateCommand,
}: {
    readonly activeCommandId: CommandId;
    readonly commandAvailability: CommandAvailabilityMap;
    readonly group: SketchToolGroupDefinition;
    readonly onActivateCommand: (commandId: CommandId) => void;
}) {
    const primaryAvailability = group.primaryCommandId
        ? commandAvailability[group.primaryCommandId]
        : null;
    const isActive = group.tools.some((tool) => tool.commandId === activeCommandId);
    const primaryTitle =
        primaryAvailability?.reason ??
        (group.primaryCommandId ? group.label : `${group.label}：尚未实现`);

    return (
        <div className="cad-workbench__sketch-tool-group">
            <button
                className="cad-workbench__sketch-tool"
                disabled={!group.primaryCommandId || primaryAvailability?.enabled === false}
                title={primaryTitle}
                type="button"
                aria-label={group.label}
                aria-pressed={isActive}
                onClick={() => {
                    if (group.primaryCommandId && primaryAvailability?.enabled !== false) {
                        onActivateCommand(group.primaryCommandId);
                    }
                }}
            >
                <SketchToolIconView icon={group.icon} />
                <span className="cad-workbench__sketch-tool-label">{group.label}</span>
            </button>
            <button
                className="cad-workbench__sketch-tool-menu"
                type="button"
                aria-label={`${group.label} 工具`}
                title={`${group.label} 工具`}
            >
                v
            </button>
            <div className="cad-workbench__sketch-tool-menu-panel" role="menu">
                {group.tools.map((tool) => (
                    <SketchToolMenuItem
                        key={tool.label}
                        activeCommandId={activeCommandId}
                        commandAvailability={commandAvailability}
                        onActivateCommand={onActivateCommand}
                        tool={tool}
                    />
                ))}
            </div>
        </div>
    );
}

function SketchToolMenuItem({
    activeCommandId,
    commandAvailability,
    onActivateCommand,
    tool,
}: {
    readonly activeCommandId: CommandId;
    readonly commandAvailability: CommandAvailabilityMap;
    readonly onActivateCommand: (commandId: CommandId) => void;
    readonly tool: SketchToolDefinition;
}) {
    const availability = tool.commandId ? commandAvailability[tool.commandId] : null;
    const isEnabled = Boolean(tool.commandId && availability?.enabled !== false);
    const title = availability?.reason ?? (isEnabled ? tool.label : `${tool.label}：尚未实现`);

    return (
        <button
            className="cad-workbench__sketch-tool-menu-item"
            disabled={!isEnabled}
            type="button"
            role="menuitem"
            title={title}
            aria-pressed={tool.commandId === activeCommandId}
            onClick={() => {
                if (tool.commandId && isEnabled) {
                    onActivateCommand(tool.commandId);
                }
            }}
        >
            <SketchToolIconView icon={tool.icon} />
            <span>{tool.label}</span>
            {tool.shortcut ? (
                <span className="cad-workbench__sketch-tool-shortcut">{tool.shortcut}</span>
            ) : null}
        </button>
    );
}

function SketchToolIconView({ icon }: { readonly icon: SketchToolIcon }) {
    return (
        <svg
            className="cad-workbench__sketch-tool-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            {renderSketchToolIcon(icon)}
        </svg>
    );
}

function renderSketchToolIcon(icon: SketchToolIcon) {
    switch (icon) {
        case 'aligned-rectangle':
            return (
                <>
                    <path d="M6 8h12v8H6z" />
                    <path d="M6 16l12-8" />
                </>
            );
        case 'arc':
            return <path d="M5 17c2-8 8-12 14-10" />;
        case 'bezier':
            return (
                <>
                    <path d="M4 17c5-10 11 4 16-6" />
                    <path d="M4 17l5-8M20 11l-5 4" />
                </>
            );
        case 'center-circle':
            return (
                <>
                    <circle cx="12" cy="12" r="6" />
                    <path d="M12 8v8M8 12h8" />
                </>
            );
        case 'center-rectangle':
            return (
                <>
                    <path d="M5 7h14v10H5z" />
                    <path d="M12 9v6M9 12h6" />
                </>
            );
        case 'circle-3-point':
            return (
                <>
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="7" cy="9" r="1" />
                    <circle cx="14" cy="6" r="1" />
                    <circle cx="18" cy="14" r="1" />
                </>
            );
        case 'circle-conic':
            return <path d="M5 17c4-12 10-12 14 0" />;
        case 'control-spline':
            return (
                <>
                    <path d="M4 16c5-9 11 3 16-7" />
                    <path d="M6 15h4M14 11h4" />
                    <circle cx="6" cy="15" r="1" />
                    <circle cx="18" cy="9" r="1" />
                </>
            );
        case 'corner-rectangle':
            return <path d="M5 7h14v10H5z" />;
        case 'ellipse':
            return <ellipse cx="12" cy="12" rx="8" ry="5" />;
        case 'ellipse-arc':
            return <path d="M4 14c3-7 13-7 16 0" />;
        case 'inscribed-polygon':
            return <path d="M12 4l8 6-3 10H7L4 10z" />;
        case 'line':
            return <path d="M5 18L19 6" />;
        case 'midpoint-line':
            return (
                <>
                    <path d="M5 18L19 6" />
                    <circle cx="12" cy="12" r="1.5" />
                </>
            );
        case 'point':
            return <circle cx="12" cy="12" r="3" />;
        case 'spline':
            return <path d="M4 16c5-9 11 3 16-7" />;
        case 'tangent-arc':
            return (
                <>
                    <path d="M5 17c4-8 9-10 14-7" />
                    <path d="M4 18h8" />
                </>
            );
    }
}
