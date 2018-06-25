'use babel';

import * as React from 'react';
import ReactDOM from 'react-dom';
import { Provider, Subscribe, createStore } from 'react-contextual'

const store = createStore({
	sex: 'male',
});

const becomeMale = state => ({
	sex: 'male',
})
const becomeFemale = state => ({
	sex: 'female',
})

class TextFragmentView extends React.Component {
	render(): React.Node {
		const {fragment} = this.props;
		return (
			<span>
				{fragment.text}
			</span>
		);
	}
}

class ConditionalFragmentView extends React.Component {
	_isConditionMet(state): boolean {
		return state.sex === 'female';
	}

	render(): React.Node {
		const {fragment} = this.props;
		return (
			<span className="highlighted">
				<Subscribe to={store}>
					{(state) => (
						this._isConditionMet(state) ? (
							<FragmentView fragment={fragment.trueFragment} />
						) : (
							fragment.falseFragment ? (
								<FragmentView fragment={fragment.falseFragment} />
							) : (
								null
							)
						)
					)}
				</Subscribe>
			</span>
		);
	}
}

class FragmentView extends React.Component {
	render(): React.Node {
		const {fragment} = this.props;
		switch (fragment.type) {
			case 'text':
				return <TextFragmentView {...this.props}/>;
			case 'condition':
				return <ConditionalFragmentView {...this.props}/>;
		}
		return <span>lmao it broke</span>;
	}
}

class NodeView extends React.Component {
	render(): React.Node {
		const {node} = this.props;
		return (
			<div className="code">
				{node.fragments.map(fragment =>
					<FragmentView fragment={fragment} />
				)}
			</div>
		);
	}
}

class ModelView extends React.Component {
	render(): React.Node {
		const {model} = this.props;
		return (
			<Provider store={store}>
				<div style={{width: '400px'}}>
					{model.nodes.map(node =>
						<NodeView node={node} />
					)}
					<button onClick={this.onSelectionChanged.bind(this)}>
						Load selected content
					</button>
				</div>
			</Provider>
		);
	}

	onSelectionChanged(): void {
		const activeTextEditor = atom.workspace.getActiveTextEditor();
		const selectedBufferRange = activeTextEditor.getSelectedBufferRange();
		const startRow = selectedBufferRange.start.row;
		const endRow = selectedBufferRange.end.column === 0
			? selectedBufferRange.end.row
			: selectedBufferRange.end.row + 1;

		const lines = [];
		for (let i = startRow; i < endRow; i++) {
			const line = activeTextEditor.lineTextForBufferRow(i);
			lines.push(line);
		}

		this.props.model.setLines(lines);
	}
}

type test = Foo;

class Node {
	fragments = [];
}

class Model {
	lines = [];
	nodes = [];

	render(container: ?HTMLElement = null): void {
		const view = <ModelView model={this}/>;
		if (container === null) {
			container = document.getElementById('root');
		}
		ReactDOM.render(view, container);
	}

	setLines(lines: Array<string>): void {
		this.lines = lines;
		this.parseNodes();
		this.render();
	}

	parseNodes(): void {
		this.nodes = [];
		for (let i = 0; i < this.lines.length; i++) {
			const line = this.lines[i];
			let lastNodeIndex = 0;

			match = line.match(/^\t*say "(.*?)";(?:.*)$/);

			if (match === null) {
				console.warn('exception parsing line index: ' + i);
				continue;
			}

			const node = new Node();
			[_, restToParse] = match;
			while (true) {
				match = restToParse.match(/\[(.*?)\]/);

				if (match === null) {
					break;
				}

				// pull out text info
				bracketText = match[1];
				node.fragments.push({
					type: 'text',
					text: restToParse.substr(0, match.index),
				});
				restToParse = restToParse.substr(match.index + bracketText.length + 2); // 2 for bracket chars

				// pull out bracket info and see if it's an
				// if
				match = bracketText.match(/^if (.+)/);
				if (match !== null) {
					[_, condition] = match;
					const fragment = {
						type: 'condition',
						trueFragment: {
							type: 'text',
							text: condition,
						},
					};

					match = restToParse.match(/\[end if\]/);
					if (match !== null) {
						node.fragments.push({
							type: 'text',
							text: restToParse.substr(0, match.index),
						});
						restToParse = restToParse.substr(match.index + 8); // 8 for [end if]
					} else {
						console.warn('parse error--no [end if] after [if] condition');
					}

					node.fragments.push(fragment);
					continue;
				}
			}
			node.fragments.push({
				type: 'text',
				text: restToParse,
			});
			this.nodes.push(node);
		}
	}
}

function provider(model: Model): ModelView {
	const root = document.createElement('div');
	root.id = 'root';
	model.render(root);
	return root;
}

export default {
	model: null,
	panel: null,
	activeTextEditor: null,

	activate(state: mixed): void {
		atom.views.addViewProvider(Model, provider);
		this.model = new Model();
		this.panel = atom.workspace.addRightPanel({item: this.model, priority: 110});
		this.toggle();

		atom.commands.add(
			'atom-text-editor',
			'preview-flexible-survival:toggle',
			() => this.toggle(),
		);

		// atom.workspace.observeActiveTextEditor(textEditor => {
		// 	this.activeTextEditor = textEditor;
		// 	textEditor.onDidChangeSelectionRange(event => {
		// 		this.onSelectionChanged(event);
		// 	});
		// });
	},

	deactivate(): void {
		this.panel.destroy();
	},

	toggle(): void {
		if (this.panel.isVisible()) {
			this.panel.hide();
		} else {
			this.panel.show();
		}
	}
}
