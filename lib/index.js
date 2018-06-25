'use babel';

import * as React from 'react';
import ReactDOM from 'react-dom';

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
	render(): React.Node {
		const {fragment} = this.props;
		return (
			<span className="highlighted">
				{fragment.text}
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
		const fragments = node.fragments.map(fragment =>
			<FragmentView fragment={fragment} />
		);
		return (
			<div className="code">
				{fragments}
			</div>
		);
	}
}

class ModelView extends React.Component {
	render(): React.Node {
		const {model} = this.props;
		const nodes = model.nodes.map(node =>
			<NodeView node={node} />
		);
		return (
			<div style={{width: '400px'}}>
				{nodes}
				<button onClick={this.onSelectionChanged.bind(this)}>
					Load selected content
				</button>
			</div>
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

				bracketText = match[1];
				node.fragments.push({
					type: 'text',
					text: restToParse.substr(0, match.index),
				});
				node.fragments.push({
					type: 'condition',
					text: bracketText,
				});
				restToParse = restToParse.substr(match.index + bracketText.length + 2); // 2 for bracket chars
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
