import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface UiPanelProps {
    children: ReactNode;
    title?: string;
}

export interface UiBadgeProps {
    children: ReactNode;
}

export interface UiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean;
}

export interface UiDataFieldProps {
    label: string;
    value: string;
}

export interface UiStatusCardProps {
    label: string;
    value: string;
}

export interface UiStatChipProps {
    label: string;
    value: string;
}

export interface UiPillProps {
    children: ReactNode;
}

export const cadThemeTokens = {
    accent: '#203d63',
    panelRadius: '24px',
    surfaceInk: '#172338',
} as const;

export function UiPanel({ children, title }: UiPanelProps) {
    return (
        <section className="occt-ui-panel">
            {title ? <h2 className="occt-ui-section-title">{title}</h2> : null}
            {children}
        </section>
    );
}

export function UiBadge({ children }: UiBadgeProps) {
    return <span className="occt-ui-badge">{children}</span>;
}

export function UiButton({
    active = false,
    children,
    className,
    type = 'button',
    ...props
}: UiButtonProps) {
    const nextClassName = [
        'occt-ui-button',
        active ? 'occt-ui-button--active' : '',
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button {...props} className={nextClassName} type={type}>
            {children}
        </button>
    );
}

export function UiDataField({ label, value }: UiDataFieldProps) {
    return (
        <div className="occt-ui-data-field">
            <span className="occt-ui-data-field__label">{label}</span>
            <strong className="occt-ui-data-field__value">{value}</strong>
        </div>
    );
}

export function UiStatusCard({ label, value }: UiStatusCardProps) {
    return (
        <div className="occt-ui-status-card">
            <span className="occt-ui-status-card__label">{label}</span>
            <span className="occt-ui-status-card__value">{value}</span>
        </div>
    );
}

export function UiStatChip({ label, value }: UiStatChipProps) {
    return (
        <div className="occt-ui-chip">
            <span className="occt-ui-chip__label">{label}</span>
            <span className="occt-ui-chip__value">{value}</span>
        </div>
    );
}

export function UiPill({ children }: UiPillProps) {
    return <span className="occt-ui-pill">{children}</span>;
}
