import { createEditDraft } from '@occt-draw/core';
import { CadCommand, type CommandContext } from './CadCommand';

export class SketchCommand extends CadCommand {
    readonly id = 'sketch';

    override enter(context: CommandContext): void {
        context.replaceDraft(createEditDraft({ id: 'draft:sketch', kind: 'sketch' }));
        context.setMessage('草图命令已进入，真实草图将在下一阶段实现。');
    }

    override cancel(context: CommandContext): void {
        context.replaceDraft(null);
    }
}
