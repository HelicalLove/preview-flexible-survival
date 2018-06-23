'use babel';

import * as React from 'react';
import ReactDOM from 'react-dom';

class View extends React.Component {
	render(): React.Node {
		return <div>text: {this.props.model.text}</div>;
	}
}

class Model {
	render(container: ?HTMLElement = null): void {
		const view = <View model={this}/>;
		if (container === null) {
			container = document.getElementById('root');
		}
		ReactDOM.render(view, container);
	}
}

function provider(model: Model): View {
	const root = document.createElement('div');
	root.id = 'root';
	root.style.maxWidth = '25%';
	root.style.overflowX = 'hidden';
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
		const text = this.activeTextEditor.getTextInBufferRange(selectedBufferRange);
		console.log(text);
		this.model.text = text;
		this.model.render();
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
