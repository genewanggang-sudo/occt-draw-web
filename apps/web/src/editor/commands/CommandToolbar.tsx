import { commandDefinitions, type CommandAvailabilityMap, type CommandId } from '@occt-draw/editor';
import { SplitIconDropdown, ToolbarIconId, type SplitIconDropdownItem } from '@occt-draw/ui';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface SketchToolbarTool {
    readonly commandId?: CommandId;
    readonly icon: ToolbarIconId;
    readonly label: string;
    readonly shortcut?: string;
}

interface SketchToolbarGroup {
    readonly label: string;
    readonly tools: readonly SketchToolbarTool[];
}

const sketchDrawingToolGroups: readonly SketchToolbarGroup[] = [
    {
        label: '线',
        tools: [
            {
                commandId: 'sketch-line',
                icon: ToolbarIconId.Line,
                label: '线',
                shortcut: 'L',
            },
            {
                commandId: 'sketch-midpoint-line',
                icon: ToolbarIconId.MidpointLine,
                label: '中点线',
            },
        ],
    },
    {
        label: '拐角矩形',
        tools: [
            {
                commandId: 'sketch-rectangle',
                icon: ToolbarIconId.CornerRectangle,
                label: '拐角矩形',
                shortcut: 'G',
            },
            {
                commandId: 'sketch-center-rectangle',
                icon: ToolbarIconId.CenterRectangle,
                label: '中心点矩形',
                shortcut: 'R',
            },
            {
                commandId: 'sketch-aligned-rectangle',
                icon: ToolbarIconId.AlignedRectangle,
                label: '对齐矩形',
            },
        ],
    },
    {
        label: '中心点圆',
        tools: [
            {
                commandId: 'sketch-circle',
                icon: ToolbarIconId.CenterCircle,
                label: '中心点圆',
                shortcut: 'C',
            },
            {
                commandId: 'sketch-3-point-circle',
                icon: ToolbarIconId.Circle3Point,
                label: '3 点圆',
            },
            {
                commandId: 'sketch-ellipse',
                icon: ToolbarIconId.Ellipse,
                label: '椭圆',
            },
        ],
    },
    {
        label: '圆弧',
        tools: [
            {
                commandId: 'sketch-3-point-arc',
                icon: ToolbarIconId.Arc,
                label: '3 点圆弧',
                shortcut: 'A',
            },
            {
                commandId: 'sketch-tangent-arc',
                icon: ToolbarIconId.TangentArc,
                label: '相切圆弧',
            },
            {
                commandId: 'sketch-center-arc',
                icon: ToolbarIconId.CenterArc,
                label: '圆心圆弧',
            },
            {
                commandId: 'sketch-elliptical-arc',
                icon: ToolbarIconId.EllipseArc,
                label: '椭圆弧',
            },
            {
                commandId: 'sketch-conic',
                icon: ToolbarIconId.CircleConic,
                label: '圆锥',
            },
        ],
    },
] as const;

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
    const [openSketchToolMenu, setOpenSketchToolMenu] = useState<string | null>(null);
    const [selectedSketchTools, setSelectedSketchTools] = useState<
        Readonly<Record<string, string>>
    >({});
    const sketchToolbarRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!openSketchToolMenu) {
            return;
        }

        const closeOnOutsidePointer = (event: PointerEvent) => {
            if (
                !(event.target instanceof Node) ||
                !sketchToolbarRef.current?.contains(event.target)
            ) {
                setOpenSketchToolMenu(null);
            }
        };

        document.addEventListener('pointerdown', closeOnOutsidePointer);

        return () => {
            document.removeEventListener('pointerdown', closeOnOutsidePointer);
        };
    }, [openSketchToolMenu]);

    if (isEditingSketch) {
        return (
            <nav
                ref={sketchToolbarRef}
                className="cad-workbench__command-actions cad-workbench__command-actions--sketch"
                aria-label="草图工具"
            >
                <ToolbarGroup label="草图选择">
                    <button
                        className="cad-workbench__action cad-workbench__action--command"
                        type="button"
                        aria-pressed={activeCommandId === 'select'}
                        onClick={() => {
                            onActivateCommand('select');
                        }}
                    >
                        Select
                    </button>
                </ToolbarGroup>
                <ToolbarGroup label="草图绘制">
                    {sketchDrawingToolGroups.map((group) => (
                        <SketchToolGroup
                            key={group.label}
                            activeCommandId={activeCommandId}
                            commandAvailability={commandAvailability}
                            group={group}
                            isMenuOpen={openSketchToolMenu === group.label}
                            onActivateCommand={onActivateCommand}
                            onSelectTool={(tool) => {
                                setSelectedSketchTools((current) => ({
                                    ...current,
                                    [group.label]: tool.label,
                                }));
                            }}
                            onToggleMenu={() => {
                                setOpenSketchToolMenu((current) =>
                                    current === group.label ? null : group.label,
                                );
                            }}
                            onCloseMenu={() => {
                                setOpenSketchToolMenu((current) =>
                                    current === group.label ? null : current,
                                );
                            }}
                            selectedToolLabel={selectedSketchTools[group.label]}
                        />
                    ))}
                </ToolbarGroup>
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

function ToolbarGroup({
    children,
    label,
}: {
    readonly children: ReactNode;
    readonly label: string;
}) {
    return (
        <div className="cad-workbench__toolbar-group" aria-label={label}>
            {children}
        </div>
    );
}

function SketchToolGroup({
    activeCommandId,
    commandAvailability,
    group,
    isMenuOpen,
    onActivateCommand,
    onCloseMenu,
    onSelectTool,
    onToggleMenu,
    selectedToolLabel,
}: {
    readonly activeCommandId: CommandId;
    readonly commandAvailability: CommandAvailabilityMap;
    readonly group: SketchToolbarGroup;
    readonly isMenuOpen: boolean;
    readonly onActivateCommand: (commandId: CommandId) => void;
    readonly onCloseMenu: () => void;
    readonly onSelectTool: (tool: SketchToolbarTool) => void;
    readonly onToggleMenu: () => void;
    readonly selectedToolLabel: string | undefined;
}) {
    const activeTool = group.tools.find((tool) => tool.commandId === activeCommandId);
    const selectedTool =
        activeTool ??
        group.tools.find((tool) => tool.label === selectedToolLabel) ??
        group.tools[0];

    if (!selectedTool) {
        return null;
    }

    const selectedAvailability = selectedTool.commandId
        ? commandAvailability[selectedTool.commandId]
        : null;
    const isSelectedToolEnabled = Boolean(
        selectedTool.commandId && selectedAvailability?.enabled !== false,
    );
    const isSelectedToolDisabled = Boolean(
        selectedTool.commandId && selectedAvailability?.enabled === false,
    );
    const isActive = selectedTool.commandId === activeCommandId;
    const primaryTitle =
        selectedTool.commandId && selectedAvailability?.reason
            ? selectedAvailability.reason
            : selectedTool.commandId
              ? selectedTool.label
              : selectedTool.label;
    const menuItems = group.tools.map((tool): SplitIconDropdownItem => {
        const availability = tool.commandId ? commandAvailability[tool.commandId] : null;
        const isDisabled = Boolean(tool.commandId && availability?.enabled === false);

        return {
            disabled: isDisabled,
            icon: tool.icon,
            id: tool.label,
            label: tool.label,
            ...(tool.shortcut ? { shortcut: tool.shortcut } : {}),
            title: availability?.reason ?? tool.label,
        };
    });

    const selectTool = (item: SplitIconDropdownItem) => {
        const tool = group.tools.find((candidate) => candidate.label === item.id);

        if (!tool) {
            return;
        }

        const availability = tool.commandId ? commandAvailability[tool.commandId] : null;
        const isEnabled = Boolean(tool.commandId && availability?.enabled !== false);

        onSelectTool(tool);

        if (tool.commandId && isEnabled) {
            onActivateCommand(tool.commandId);
        }
    };

    return (
        <SplitIconDropdown
            active={isActive}
            ariaLabel={selectedTool.label}
            caretAriaLabel={`${group.label} 工具`}
            caretTitle={`${group.label} 工具`}
            classNamePrefix="cad-workbench"
            disabled={isSelectedToolDisabled}
            isOpen={isMenuOpen}
            items={menuItems}
            onClose={onCloseMenu}
            onPrimaryAction={() => {
                if (selectedTool.commandId && isSelectedToolEnabled) {
                    onActivateCommand(selectedTool.commandId);
                }
            }}
            onSelectItem={selectTool}
            onToggleOpen={onToggleMenu}
            selectedItemId={selectedTool.label}
            title={primaryTitle}
        />
    );
}
