import { StateField, StateEffect, Transaction } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { HighlightColor } from './types';

export const addHighlightEffect = StateEffect.define<{
	from: number;
	to: number;
	id: string;
	color: HighlightColor;
}>();

export const removeHighlightEffect = StateEffect.define<{ id: string }>();

export const clearHighlightsEffect = StateEffect.define<null>();

export const highlightField = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},

	update(decorations: DecorationSet, tr: Transaction): DecorationSet {
		decorations = decorations.map(tr.changes);

		for (const effect of tr.effects) {
			if (effect.is(addHighlightEffect)) {
				const { from, to, id, color } = effect.value;
				const mark = Decoration.mark({
					class: `obsidian-comments-highlight obsidian-comments-highlight-${color}`,
					attributes: {
						'data-highlight-id': id,
						'data-highlight-color': color,
					},
				});
				decorations = decorations.update({
					add: [mark.range(from, to)],
					sort: true,
				});
			} else if (effect.is(removeHighlightEffect)) {
				decorations = decorations.update({
					filter: (_from, _to, deco) =>
						deco.spec.attributes?.['data-highlight-id'] !== effect.value.id,
				});
			} else if (effect.is(clearHighlightsEffect)) {
				decorations = Decoration.none;
			}
		}

		return decorations;
	},

	provide: (field) => EditorView.decorations.from(field),
});
