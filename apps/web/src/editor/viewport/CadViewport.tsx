import type { PointerEvent, RefObject, WheelEvent } from 'react';

interface CadViewportProps {
    readonly activeCommandLabel: string;
    readonly canvasRef: RefObject<HTMLCanvasElement | null>;
    readonly documentName: string;
    readonly onPointerCancel: (event: PointerEvent<HTMLCanvasElement>) => void;
    readonly onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void;
    readonly onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => void;
    readonly onPointerUp: (event: PointerEvent<HTMLCanvasElement>) => void;
    readonly onWheel: (event: WheelEvent<HTMLCanvasElement>) => void;
    readonly rendererStatus: string;
    readonly sceneObjectCount: number;
}

export function CadViewport({
    activeCommandLabel,
    canvasRef,
    documentName,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    rendererStatus,
    sceneObjectCount,
}: CadViewportProps) {
    return (
        <section className="cad-workbench__viewport" aria-label="三维视窗">
            <canvas
                ref={canvasRef}
                className="cad-workbench__canvas"
                onContextMenu={(event) => {
                    event.preventDefault();
                }}
                onPointerCancel={onPointerCancel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onWheel={onWheel}
            />
            <div className="cad-workbench__viewport-footer">
                <div className="cad-workbench__status" role="status">
                    <span>{rendererStatus}</span>
                    <span>{`文档：${documentName}`}</span>
                    <span>{`命令：${activeCommandLabel}`}</span>
                    <span>正交视图</span>
                    <span>{`场景对象 ${sceneObjectCount.toString()} 个`}</span>
                </div>
                <div className="cad-workbench__help" aria-label="视窗操作提示">
                    <span>右键旋转</span>
                    <span>中键平移</span>
                    <span>滚轮缩放</span>
                    <span>F 适配</span>
                </div>
            </div>
        </section>
    );
}
