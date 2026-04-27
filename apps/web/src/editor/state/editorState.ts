import type { CadDocument } from '@occt-draw/core';
import type { CommandSession } from '../commands/commandTypes';
import type { SelectionState } from '../selection/selectionState';
import type { ViewNavigationState } from '../view-navigation/viewNavigation';

export interface EditorState {
    readonly commandSession: CommandSession;
    readonly document: CadDocument;
    readonly navigation: ViewNavigationState;
    readonly selection: SelectionState;
}
