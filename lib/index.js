'use babel';

import * as React from 'react';
import { Provider, Subscribe, createStore } from 'react-contextual';
import ReactDOM from 'react-dom';

const store = createStore({
	male: true,
	female: false,
});

const toggleMale = state => ({
	male: !state.male,
});
const toggleFemale = state => ({
	female: !state.female,
});

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
		const {fragment: {condition}} = this.props;
		console.log(condition);
		switch (condition.type) {
			case 'expression':
				if (condition.left === 'player') {
					switch (condition.operator) {
						case 'is':
							return state.male === (condition.right === 'male');
						case 'is not':
							return state.female === (condition.right === 'female');
						default:
							console.warn('fucked up on ' + JSON.stringify(condition));
							return true;
					}
				}
				console.warn(`cant parse ${condition.left} yet`);
			default:
				console.warn(`cant parse ${condition.type} yet`);
				return true;
		}
	}

	render(): React.Node {
		const {fragment} = this.props;
		return (
			<span className="highlighted">
				<Subscribe to={store}>
					{(state) => (
						this._isConditionMet(state) ? (
							<FragmentView fragment={fragment.ifFragment} />
						) : (
							fragment.elseFragment ? (
								<FragmentView fragment={fragment.elseFragment} />
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

class BracketFragmentView extends React.Component {
	render(): React.Node {
		const {fragment} = this.props;
		return (
			<span className="bracket">
				[{fragment.text}]
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
			case 'bracket':
				return <BracketFragmentView {...this.props} />;
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

class StoreButtons extends React.Component {
	render(): React.Node {
		return (
			<Subscribe to={store}>
				{(state) => (
					<div>
						<button onClick={() => state.setState(toggleMale)}>
							{state.male ? '✔️' : '❌'} Male
						</button>
						<button onClick={() => state.setState(toggleFemale)}>
							{state.female ? '✔️' : '❌'} Female
						</button>
					</div>
				)}
			</Subscribe>
		);
	}
}

class ModelView extends React.Component {
	render(): React.Node {
		const {model} = this.props;
		return (
			<Provider store={store}>
				<button onClick={() => this.onSelectionChanged()}>
					Load selected content
				</button>
				<StoreButtons />
				<div className="model">
					{model.nodes.map(node =>
						<NodeView node={node} />
					)}
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
		this.nodes = this.parseNodes();
		this.render();
	}

	parseCondition(rawText): Object {
		// const rawExpressions = rawText.split(/ (and|or) /);
		// const expressions = rawExpresions.map(rawExpression => {
		const match = rawText.match(/^(.+?) (is not|is) (.+?)$/);
		if (match === null) {
			return {
				type: 'unknown expression',
				text: rawText,
			}
		}
		const [_, left, operator, right] = match;

		return {
			type: 'expression',
			left: left,
			operator: operator,
			right: right,
		};
	}

	// say node
	parseSay(rawText): Array<Object> {
		// STEP 1: create raw fragment pieces in one layer
		const rawFragmentPieces = [];
		let restOfTheLine = rawText;
		let match = null;
		while (true) {
			match = restOfTheLine.match(/^(.*?)\[(.*?)\]/);

			if (match === null) {
				break;
			}

			// fetch the rest of the line
			[matchText, text, bracketText] = match;
			restOfTheLine = restOfTheLine.substr(matchText.length);

			if (text.length !== 0) {
				rawFragmentPieces.push({
					type: 'text',
					text: text,
				});
			}

			rawFragmentPieces.push({
				type: 'bracket',
				text: bracketText,
			});
		}

		if (restOfTheLine.length !== 0) {
			rawFragmentPieces.push({
				type: 'text',
				text: restOfTheLine,
			});
		}

		// STEP 2: transform raw fragments into typed fragments

		const fragments = [];
		let fragmentContext = null;
		for (let i = 0; i < rawFragmentPieces.length; i++) {
			const curRawFragmentPiece = rawFragmentPieces[i];
			switch (curRawFragmentPiece.type) {
				case 'text':
					fragments.push(curRawFragmentPiece);
					break;
				case 'bracket':
					match = curRawFragmentPiece.text.match(/^if (.+)$/);
					if (match !== null) {
						[_, condition] = match;
						const subFragment = {
							type: 'condition',
							condition: this.parseCondition(condition),
							ifFragment: {
								type: 'text',
								text: rawFragmentPieces[i+1].text,
							},
							elseFragment: null,
						};
						i += 1;
						fragmentContext = subFragment;
						fragments.push(subFragment);
						break;
					}

					match = curRawFragmentPiece.text.match(/^else if (.+)$/);
					if (match !== null) {
						[_, condition] = match;
						const subFragment = {
							type: 'condition',
							condition: this.parseCondition(condition),
							ifFragment: {
								type: 'text',
								text: rawFragmentPieces[i+1].text,
							},
							elseFragment: null,
						};
						i += 1;
						fragmentContext.elseFragment = subFragment;
						fragmentContext = subFragment;
						break;
					}

					match = curRawFragmentPiece.text.match(/^else$/);
					if (match !== null) {
						fragmentContext.elseFragment = {
							type: 'text',
							text: rawFragmentPieces[i+1].text,
						};
						i += 1;
						break;
					}

					match = curRawFragmentPiece.text.match(/^end if$/);
					if (match !== null) {
						break;
					}

					fragments.push(curRawFragmentPiece);
					break;
			}
		}

		return {
			type: 'say',
			fragments: fragments,
		};
	}

	parseNodes(): Array<Object> {
		const nodes = [];
		for (let i = 0; i < this.lines.length; i++) {
			const line = this.lines[i];
			let lastNodeIndex = 0;

			match = line.match(/^\t*say "(.*?)";(?:.*)$/);

			if (match === null) {
				console.warn('exception parsing line index: ' + i);
				continue;
			}

			[_, restToParse] = match;
			const sayFragment = this.parseSay(restToParse);
			nodes.push(sayFragment);
		}
		return nodes;
	}bo
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
