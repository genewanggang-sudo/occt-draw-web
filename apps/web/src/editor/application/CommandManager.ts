import type { SelectionSet } from '@occt-draw/core';
import {
    activateCommandSession,
    cancelCommandSession,
    completeCommandSession,
    consumeSelectionForCommandSession,
    resetToSelectCommandSession,
} from '../commands/commandReducer';
import type { CommandId, CommandSession } from '../commands/commandTypes';

export class CommandManager {
    readonly #session: CommandSession;

    constructor(session: CommandSession) {
        this.#session = session;
    }

    activate(commandId: CommandId): CommandSession {
        return activateCommandSession(this.#session, commandId);
    }

    cancel(): CommandSession {
        return cancelCommandSession(this.#session);
    }

    complete(): CommandSession {
        return completeCommandSession(this.#session);
    }

    consumeSelection(selection: SelectionSet): CommandSession {
        return consumeSelectionForCommandSession(this.#session, selection);
    }

    getSession(): CommandSession {
        return this.#session;
    }

    resetToSelect(): CommandSession {
        return resetToSelectCommandSession();
    }
}
