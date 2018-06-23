'use babel';

import * as React from 'react';
import ReactDOM from 'react-dom';

class View extends React.Component {
	render(): React.Node {
		const paragraphs = this.props.model.nodes.map(node =>
			<div>{node}</div>
		);
		return (
			<div style={{width: '400px'}}>
				{paragraphs}
			</div>
		);
	}
}

class Model {
	lines = [];
	nodes = [];

	render(container: ?HTMLElement = null): void {
		const view = <View model={this}/>;
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
		const nodes = [];
		for (let i = 0; i < this.lines.length; i++) {
			const line = this.lines[i];
			const match = line.match(/^\t*say "(.*?)";(?:.*)$/);
			try {
				[_, text] = match;

				// let isInCondition = true;
				// for (let j = 0; j < text.length; j++) {
				// 	const char = text[j];
				// 	if (char === '[') {
				// 		[_, condition] = text.substr(j).match(/$\[(.+)\]/);
				// 		nodes.push(condition);
				// 	}
				// }
				nodes.push(text);
			} catch (e) {
				console.warn('exception parsing line index: ' + i);
			}
		}
		this.nodes = nodes;
	}
}

function provider(model: Model): View {
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

		atom.workspace.observeActiveTextEditor(textEditor => {
			this.activeTextEditor = textEditor;
			textEditor.onDidChangeSelectionRange(event => {
				this.onSelectionChanged(event);
			});
		});
	},

	onSelectionChanged(event): void {
		const selectedBufferRange = this.activeTextEditor.getSelectedBufferRange();
		const startRow = selectedBufferRange.start.row;
		const endRow = selectedBufferRange.end.column === 0
			? selectedBufferRange.end.row
			: selectedBufferRange.end.row + 1;

		const lines = [];
		for (let i = startRow; i < endRow; i++) {
			const line = this.activeTextEditor.lineTextForBufferRow(i);
			lines.push(line);
		}

		this.model.setLines(lines);
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
