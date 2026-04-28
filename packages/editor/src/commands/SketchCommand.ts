import { createEditDraft } from '@occt-draw/core';
import { CadCommand, createHandledCommandResult, type CommandResult } from './CadCommand';

export class SketchCommand extends CadCommand {
    public readonly id = 'sketch';

    public override enter(): CommandResult {
        return createHandledCommandResult({
            draft: createEditDraft({ id: 'draft:sketch', kind: 'sketch' }),
            message: '草图命令已进入，真实草图将在下一阶段实现。',
        });
    }

    public override cancel(): CommandResult {
        return createHandledCommandResult({ draft: null });
    }

    public override exit(): CommandResult {
        return createHandledCommandResult({ draft: null });
    }
}
