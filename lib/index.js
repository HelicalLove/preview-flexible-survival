'use babel';

import {Emitter} from 'atom';
import * as React from 'react';
import ReactDOM from 'react-dom';

class View extends React.Component {
	render(): React.Node {
		return <div>hi</div>;
	}
}

class Model {
	render(container: ?HTMLElement = null): React.Node {
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
	model.render(root);
	return root;
}

class Preview {
	activate(state: mixed): void {
		atom.views.addViewProvider(Model, provider);
		const model = new Model();
		const view = atom.workspace.addRightPanel({item: model, priority: 110});
		view.show();
		const emitter = new Emitter();

		atom.commands.add(
			'atom-text-editor',
			'preview-flexible-survival:toggle',
			() => this.toggle(),
		);
	}

	deactivate(): void {

	}

	toggle(): void {
		console.log('toggled');
	}
}

export default Object.freeze(new Preview());
