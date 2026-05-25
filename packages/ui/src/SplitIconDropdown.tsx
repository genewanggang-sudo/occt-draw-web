import { useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ToolbarIcon, ToolbarIconId } from './ToolbarIcon';

export interface SplitIconDropdownItem {
    readonly disabled?: boolean;
    readonly icon: ToolbarIconId;
    readonly id: string;
    readonly label: string;
    readonly shortcut?: string;
    readonly title?: string;
}

export interface SplitIconDropdownProps {
    readonly active?: boolean;
    readonly ariaLabel: string;
    readonly caretAriaLabel: string;
    readonly caretTitle?: string;
    readonly classNamePrefix: string;
    readonly disabled?: boolean;
    readonly isOpen: boolean;
    readonly items: readonly SplitIconDropdownItem[];
    readonly onClose: () => void;
    readonly onPrimaryAction: (item: SplitIconDropdownItem) => void;
    readonly onSelectItem: (item: SplitIconDropdownItem) => void;
    readonly onToggleOpen: () => void;
    readonly selectedItemId: string;
    readonly title?: string;
}

export function SplitIconDropdown({
    active = false,
    ariaLabel,
    caretAriaLabel,
    caretTitle,
    classNamePrefix,
    disabled = false,
    isOpen,
    items,
    onClose,
    onPrimaryAction,
    onSelectItem,
    onToggleOpen,
    selectedItemId,
    title,
}: SplitIconDropdownProps) {
    const menuButtonRef = useRef<HTMLButtonElement | null>(null);
    const menuPanelRef = useRef<HTMLDivElement | null>(null);
    const shouldRestoreMenuButtonFocusRef = useRef(false);
    const selectedItem = items.find((item) => item.id === selectedItemId) ?? items[0];

    if (!selectedItem) {
        return null;
    }

    const focusMenuItem = (index: number) => {
        const menuItems = getMenuItems(menuPanelRef.current);

        if (menuItems.length === 0) {
            return;
        }

        menuItems[(index + menuItems.length) % menuItems.length]?.focus();
    };

    const selectItem = (item: SplitIconDropdownItem) => {
        if (item.disabled) {
            return;
        }

        onSelectItem(item);
        shouldRestoreMenuButtonFocusRef.current = true;
        onClose();
    };

    const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        const menuItems = getMenuItems(menuPanelRef.current);
        const activeIndex = menuItems.findIndex((item) => item === document.activeElement);
        const currentIndex =
            activeIndex >= 0
                ? activeIndex
                : menuItems.findIndex((item) => item.dataset.selected === 'true');

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            event.stopPropagation();
            focusMenuItem(currentIndex + 1);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            focusMenuItem(currentIndex - 1);
            return;
        }

        if (event.key === 'Home') {
            event.preventDefault();
            event.stopPropagation();
            focusMenuItem(0);
            return;
        }

        if (event.key === 'End') {
            event.preventDefault();
            event.stopPropagation();
            focusMenuItem(menuItems.length - 1);
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            shouldRestoreMenuButtonFocusRef.current = true;
            onClose();
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            const focusedItem = menuItems[activeIndex];

            if (focusedItem) {
                focusedItem.click();
            }
            return;
        }

        if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
            const shortcut = event.key.toUpperCase();
            const shortcutItem = items.find((item) => item.shortcut === shortcut);

            if (shortcutItem) {
                event.preventDefault();
                event.stopPropagation();
                selectItem(shortcutItem);
            }
        }
    };

    const handleGroupKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape' && isOpen) {
            event.preventDefault();
            event.stopPropagation();
            shouldRestoreMenuButtonFocusRef.current = true;
            onClose();
        }
    };

    return (
        <div
            className={`${classNamePrefix}__split-icon-dropdown${isOpen ? ` ${classNamePrefix}__split-icon-dropdown--open` : ''}`}
            onKeyDown={handleGroupKeyDown}
        >
            <button
                className={`${classNamePrefix}__toolbar-icon-button ${classNamePrefix}__split-icon-primary`}
                disabled={disabled}
                title={title}
                type="button"
                aria-label={ariaLabel}
                aria-pressed={active}
                aria-disabled={disabled ? true : undefined}
                onClick={(event) => {
                    if (!disabled) {
                        onPrimaryAction(selectedItem);
                    }
                    event.currentTarget.blur();
                }}
            >
                <ToolbarIcon
                    className={`${classNamePrefix}__split-icon-primary-icon`}
                    icon={selectedItem.icon}
                />
            </button>
            <button
                ref={menuButtonRef}
                className={`${classNamePrefix}__split-icon-caret`}
                type="button"
                aria-label={caretAriaLabel}
                aria-expanded={isOpen}
                title={caretTitle ?? caretAriaLabel}
                onClick={(event) => {
                    onToggleOpen();
                    event.currentTarget.blur();
                }}
                onKeyDown={(event) => {
                    if (
                        !isOpen &&
                        (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')
                    ) {
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleOpen();
                    }
                }}
            >
                <ToolbarIcon
                    className={`${classNamePrefix}__split-icon-caret-icon`}
                    icon={ToolbarIconId.Expanded}
                />
            </button>
            <div
                ref={menuPanelRef}
                className={`${classNamePrefix}__split-icon-menu-panel`}
                role="menu"
                onKeyDown={handleMenuKeyDown}
            >
                <div className={`${classNamePrefix}__split-icon-menu-content`}>
                    {items.map((item) => {
                        const selected = item.id === selectedItem.id;

                        return (
                            <button
                                key={item.id}
                                className={`${classNamePrefix}__split-icon-menu-item`}
                                type="button"
                                role="menuitemradio"
                                title={item.title ?? item.label}
                                aria-disabled={item.disabled ? true : undefined}
                                aria-checked={selected}
                                data-selected={selected ? true : undefined}
                                data-has-shortcut={item.shortcut ? true : undefined}
                                data-split-menu-item-id={item.id}
                                onClick={(event) => {
                                    selectItem(item);
                                    event.currentTarget.blur();
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Escape') {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        shouldRestoreMenuButtonFocusRef.current = true;
                                        onClose();
                                    }
                                }}
                            >
                                <ToolbarIcon
                                    className={`${classNamePrefix}__split-icon-menu-item-icon`}
                                    icon={item.icon}
                                />
                                <span className={`${classNamePrefix}__split-icon-menu-item-label`}>
                                    {item.label}
                                </span>
                                {item.shortcut ? (
                                    <span className={`${classNamePrefix}__split-icon-shortcut`}>
                                        {item.shortcut.toLowerCase()}
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function getMenuItems(menuPanel: HTMLDivElement | null) {
    return Array.from(
        menuPanel?.querySelectorAll<HTMLButtonElement>('[data-split-menu-item-id]') ?? [],
    );
}
