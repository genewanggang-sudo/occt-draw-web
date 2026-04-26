import type { ReactNode } from 'react';

interface WorkbenchLayoutProps {
    readonly inspectorPanel: ReactNode;
    readonly modelTreePanel: ReactNode;
    readonly viewport: ReactNode;
}

export function WorkbenchLayout({
    inspectorPanel,
    modelTreePanel,
    viewport,
}: WorkbenchLayoutProps) {
    return (
        <section className="cad-workbench__main" aria-label="CAD 工作区">
            {modelTreePanel}
            <div className="cad-workbench__viewport-shell">{viewport}</div>
            {inspectorPanel}
        </section>
    );
}
