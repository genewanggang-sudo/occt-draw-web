import { UiBadge, UiDataField, UiPanel, UiPill } from '@occt-draw/ui';
import { APP_NAME } from '@occt-draw/shared';

export function App() {
    const appTitle = import.meta.env.VITE_APP_TITLE || APP_NAME;
    const wasmEntry = import.meta.env.VITE_OCCT_WASM_ENTRY;

    return (
        <main className="app-shell">
            <section className="app-shell__hero">
                <UiBadge>三维云端 CAD</UiBadge>
                <h1 className="app-shell__title">{appTitle}</h1>
                <p className="app-shell__copy">
                    之前为了二维出图临时写入的交互、图元和渲染实现已经全部移除，
                    当前仓库重新回到面向三维云端 CAD 的基础框架状态。
                </p>
                <div className="app-shell__pills">
                    <UiPill>云端建模</UiPill>
                    <UiPill>协同设计</UiPill>
                    <UiPill>三维内核待接入</UiPill>
                </div>
            </section>

            <section className="app-shell__grid">
                <UiPanel title="当前状态">
                    <div className="app-shell__fields">
                        <UiDataField label="产品方向" value="三维云端 CAD" />
                        <UiDataField label="前端状态" value="仅保留框架骨架" />
                        <UiDataField label="几何内核" value="待重新规划" />
                        <UiDataField
                            label="Wasm 接入"
                            value={wasmEntry ? '保留入口配置' : '暂未配置'}
                        />
                    </div>
                </UiPanel>

                <UiPanel title="下一阶段建议">
                    <ol className="app-shell__list">
                        <li>先确定三维云 CAD 的产品边界和核心场景。</li>
                        <li>重做前端架构，围绕三维场景、装配、协同和数据流设计。</li>
                        <li>再决定渲染引擎、内核接入和云端协作方案。</li>
                    </ol>
                </UiPanel>
            </section>
        </main>
    );
}
