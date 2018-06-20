'use babel';

import PreviewFlexibleSurvivalView from './preview-flexible-survival-view';
import { CompositeDisposable } from 'atom';

export default {

  previewFlexibleSurvivalView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
		atom.beep();
    this.previewFlexibleSurvivalView = new PreviewFlexibleSurvivalView(state.previewFlexibleSurvivalViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.previewFlexibleSurvivalView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'preview-flexible-survival:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.previewFlexibleSurvivalView.destroy();
  },

  serialize() {
    return {
      previewFlexibleSurvivalViewState: this.previewFlexibleSurvivalView.serialize()
    };
  },

  toggle() {
    console.log('PreviewFlexibleSurvival was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
