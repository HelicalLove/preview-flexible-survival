'use babel';

import * as React from 'react';
import { Provider, Subscribe, createStore } from 'react-contextual';
import ReactDOM from 'react-dom';

Array.prototype.someIntersection = function(array2) {
	return this.some(value1 =>
		array2.some(value2 => value1 === value2),
	);
}

const INITIAL_STATE = {
	'cocks of player': 1,
	'cunts of player': 0,
	'submissive': 0,
};
const store = createStore(INITIAL_STATE);

const derivedState = {
	male: (s) => s['cocks of player'] > 0,
	female: (s) => s['cunts of player'] > 0,
	puremale: (s) => s['cocks of player'] > 0 && s['cunts of player'] === 0,
	purefemale: (s) => s['cocks of player'] === 0 && s['cunts of player'] > 0,
};

const resetState = _state => INITIAL_STATE;
const toggleMale = state => ({
	'cocks of player': state['cocks of player'] === 1 ? 0 : 1,
});
const toggleFemale = state => ({
	'cunts of player': state['cunts of player'] === 1 ? 0 : 1,
});
const toggleSubmissive = state => ({
	'submissive': !state.submissive,
});

const expressionsToControlConfigs = [
	{
		name: 'gender',
		states: ['male', 'female', 'puremale', 'purefemale'],
		baseStates: ['cocks of player', 'cunts of player'],
		actions: [
			(state) =>
				<button onClick={() => state.setState(toggleMale)}>
					{derivedState.male(state) ? '✔️' : '❌'} Male
				</button>,
			(state) =>
				<button onClick={() => state.setState(toggleFemale)}>
					{derivedState.female(state) ? '✔️' : '❌'} Female
				</button>,
		],
	},
	{
		name: 'feats',
		states: ['submissive'],
		actions: [
			(state) =>
				<button onClick={() => state.setState(toggleSubmissive)}>
					{state.submissive ? '✔️' : '❌'} Submissive
				</button>,
		],
	},
];

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
	_getState(state, name): mixed {
		if (name in state) {
			return state[name]
		} else if (name in derivedState) {
			return derivedState[name](state);
		} else {
			console.warn(`no state named ${name}`);
			return true;
		}
	}

	_isConditionMet(state): boolean {
		const {fragment: {condition}} = this.props;
		switch (condition.type) {
			case 'expression':
				if (condition.left === 'player') {
					switch (condition.operator) {
						case 'is':
							return this._getState(state, condition.right);
						case 'is not':
							return !this._getState(state, condition.right);
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
						<button onClick={() => console.log(JSON.stringify(state))}>
							Log State to Console
						</button>
						{this.props.storeActions.map(action => action(state))}
					</div>
				)}
			</Subscribe>
		);
	}
}

class ModelView extends React.Component {
	render(): React.Node {
		const {model} = this.props;
		const expressions = [];
		model.nodes.forEach(node =>
			forEachFragment(node.fragments, fragment => {
				if (fragment.type === 'condition') {
					if (!(fragment.condition.left in expressions)) {
						expressions.push(fragment.condition.left);
					}
					if (!(fragment.condition.right in expressions)) {
						expressions.push(fragment.condition.right);
					}
				}
			}),
		);

		const storeActions = [];
		expressionsToControlConfigs.forEach(config => {
			if (
				config.states.someIntersection(expressions)
				|| (config.baseStates && config.baseStates.someIntersection(expressions))
			) {
				config.actions.forEach(action => {
					storeActions.push(action);
				});
			}
		});

		return (
			<Provider store={store}>
				<Subscribe to={store}>
					{(state) => (
						<button onClick={() => this.onSelectionChanged(state)}>
							Load selected content
						</button>
					)}
				</Subscribe>
				<StoreButtons
					storeActions={storeActions}
				/>
				<div className="model">
					{model.nodes.map(node =>
						<NodeView node={node} />
					)}
				</div>
			</Provider>
		);
	}

	onSelectionChanged(state: Object): void {
		state.setState(resetState);

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

function forEachFragment(
	fragments: Object | Array<Object>,
	lambda: (fragment: Object) => mixed,
): void {
	if (!Array.isArray(fragments)) {
		fragments = [fragments];
	}

	fragments.forEach(fragment => {
		lambda(fragment);
		switch (fragment.type) {
			case 'text':
				break;
			case 'condition':
				const subFragments = [];
				subFragments.push(fragment.ifFragment);
				if (fragment.elseFragment !== null) {
					subFragments.push(fragment.elseFragment);
				}
				forEachFragment(subFragments, lambda);
		}
	});
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
