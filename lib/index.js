'use babel';

import * as React from 'react';
import { Provider, Subscribe, createStore } from 'react-contextual';
import ReactDOM from 'react-dom';

Object.fill = function(keys, value) {
	return keys.reduce((acc, key) =>
		{
			acc[key] = value;
			return acc;
		},
		{},
	);
};
Array.prototype.intersection = function(array2) {
	return this.filter(value1 => array2.includes(value1));
}
Array.prototype.someIntersection = function(array2) {
	return this.some(value1 =>
		array2.some(value2 => value1 === value2),
	);
}
Math.randomInt = function(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

const booleanExpressions = [
	'defaultnamed',
	'submissive',
	'kinky',
	'dominant',
	'twistcapped',
	'MProN',
	'FProN',
	'HProN',
	'NProN',
	'internal',
	'knotted',
	'perminfected',
	'pure',
	'purehuman',
	'booked',
	'bunkered',
];

const INITIAL_STATE = {
	'cocks of player': 1,
	'cunts of player': 0,
	...Object.fill(booleanExpressions, false),
};
const store = createStore(INITIAL_STATE);

const derivedState = {
	male: (s) => s['cocks of player'] > 0,
	female: (s) => s['cunts of player'] > 0,
	puremale: (s) => s['cocks of player'] > 0 && s['cunts of player'] === 0,
	purefemale: (s) => s['cocks of player'] === 0 && s['cunts of player'] > 0,
	herm: (s) => s['cocks of player'] > 0 && s['cunts of player'] > 0,
	neuter: (s) => s['cocks of player'] === 0 && s['cunts of player'] === 0,
};

const resetState = _state => INITIAL_STATE;
const toggleMale = state => ({
	'cocks of player': state['cocks of player'] === 1 ? 0 : 1,
});
const toggleFemale = state => ({
	'cunts of player': state['cunts of player'] === 1 ? 0 : 1,
});
const toggleBoolean = (state, booleanName) => ({
	[booleanName]: !state[booleanName],
});

const expressionsToControlConfigs = [
	{
		name: 'gender',
		states: ['male', 'female', 'puremale', 'purefemale', 'herm', 'neuter'],
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
];

class TextFragmentView extends React.Component {
	render(): React.Node {
		const {fragment} = this.props;
		return (
			<span className={fragment.className}>
				{fragment.text}
			</span>
		);
	}
}

class ConditionView extends React.Component {
	render(): React.Node {
		const {condition} = this.props;
		return (
			<span>{condition.left} {condition.operator} {condition.right}</span>
		);
	}
}

class ConditionalFragmentView extends React.Component {
	_getState(state, name): boolean {
		if (name in state) {
			return state[name];
		} else if (name in derivedState) {
			return derivedState[name](state);
		} else {
			throw `no state named ${name}`;
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
							throw 'fucked up on ' + JSON.stringify(condition);
					}
				}

				if (condition.right === 'listed in feats of player') {
					match = condition.left.match(/^"(.+)"$/);
					if (match !== null) {
						[_, featName] = match;
						switch (condition.operator) {
							case 'is':
								return state.feats[featName];
							case 'is not':
								return !state.feats[featName];
							default:
								throw 'fucked up on ' + JSON.stringify(condition);
						}
					}
				}
				throw `cant parse ${condition.left} yet`;
			default:
				throw `cant parse ${condition.type} yet`;
		}
	}

	render(): React.Node {
		const {fragment} = this.props;
		return (
			<span className="highlighted">
				<Subscribe to={store}>
					{(state) => {
						try {
							return this._isConditionMet(state) ? (
								<FragmentView fragment={fragment.ifFragment} />
							) : (
								<FragmentView fragment={fragment.elseFragment} />
							);
						} catch (e) {
							console.warn(e);

							switch (fragment.condition.type) {
								case 'expression':
									return (
										<span>
											<span className="bracket">
												[if <ConditionView condition={fragment.condition} />]
											</span>
											<FragmentView fragment={fragment.ifFragment} />
											<span className="bracket">
												{fragment.elseFragment && '[else]'}
											</span>
											<FragmentView fragment={fragment.elseFragment} />
											<span className="bracket">
												[end if]
											</span>
										</span>
									);
								case 'unknown expression':
									return (
										<span>
											<span className="bracket">
												[if {fragment.condition.text}]
											</span>
											<FragmentView fragment={fragment.ifFragment} />
											<span className="bracket">
												{fragment.elseFragment && '[else]'}
											</span>
											<FragmentView fragment={fragment.elseFragment} />
											<span className="bracket">
												[end if]
											</span>
										</span>
									);
							}
							console.log(fragment.type);
						}
					}}
				</Subscribe>
			</span>
		);
	}
}

class RandomFragmentView extends React.Component {
	render(): React.Node {
		const {fragment} = this.props;
		return (
			<Subscribe to={store}>
				{(state) => {
					const i = (Math.randomInt(fragment.fragments.length)) % fragment.fragments.length;
					return (
						<span className="highlighted" onClick={() => this.forceUpdate()}>
							<FragmentView fragment={fragment.fragments[i]} />
						</span>
					);
				}}
			</Subscribe>
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
		if (fragment == null) {
			return null;
		}

		switch (fragment.type) {
			case 'text':
				return <TextFragmentView {...this.props}/>;
			case 'condition':
				return <ConditionalFragmentView {...this.props}/>;
			case 'random condition':
				return <RandomFragmentView {...this.props}/>;
			case 'bracket':
				return <BracketFragmentView {...this.props} />;
			case 'font':
				// no ability to handle this yet
				return null;
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
						<button onClick={() => console.log(state)}>
							Log State to Console
						</button>
						<button onClick={() => console.log(this.props.model)}>
							Log Model to Console
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
				switch (fragment.type) {
					case 'condition':
						if (!(fragment.condition.left in expressions)) {
							expressions.push(fragment.condition.left);
						}
						if (!(fragment.condition.right in expressions)) {
							expressions.push(fragment.condition.right);
						}
						break;
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

			booleanExpressions.intersection(expressions)
				.forEach(expression => {
					storeActions.push(
						(state) =>
							<button onClick={() => state.setState(toggleBoolean(state, expression))}>
								{state[expression] ? '✔️' : '❌'} {expression}
							</button>,
						);
				});
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
					model={model}
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
		let match = null;

		match = rawText.match(/^(.+?) (is not|is) (.+?)$/);
		if (match !== null) {
			const [_, left, operator, right] = match;
			return {
				type: 'expression',
				left: left,
				operator: operator,
				right: right,
			};
		}

		return {
			type: 'unknown expression',
			text: rawText,
		}
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

					match = curRawFragmentPiece.text.match(/^one of$/);
					if (match !== null) {
						const subFragment = {
							type: 'random condition',
							fragments: [{
								type: 'text',
								text: rawFragmentPieces[i+1].text,
							}],
						};
						fragmentContext = subFragment;
						fragments.push(subFragment);
						i += 1;
						break;
					}

					match = curRawFragmentPiece.text.match(/^or$/);
					if (match !== null) {
						fragmentContext.fragments.push({
							type: 'text',
							text: rawFragmentPieces[i+1].text,
						});
						i += 1;
						break;
					}

					match = curRawFragmentPiece.text.match(/^at random$/);
					if (match !== null) {
						break;
					}

					match = curRawFragmentPiece.text.match(/^bold type$/);
					if (match !== null) {
						fragments.push({
							type: 'font',
							format: 'bold',
						});
						break;
					}

					match = curRawFragmentPiece.text.match(/^roman type$/);
					if (match !== null) {
						fragments.push({
							type: 'font',
							format: 'roman',
						});
						break;
					}

					match = curRawFragmentPiece.text.match(/^'$/);
					if (match !== null) {
						fragments.push({
							type: 'text',
							text: '\'',
						});
						break;
					}

					match = curRawFragmentPiece.text.match(/^bracket$/);
					if (match !== null) {
						fragments.push({
							type: 'text',
							text: '[',
						});
						break;
					}

					match = curRawFragmentPiece.text.match(/^close bracket$/);
					if (match !== null) {
						fragments.push({
							type: 'text',
							text: ']',
						});
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
