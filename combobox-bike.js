'use strict';
(() => {
  var lastId = 0;
  var lastSTO;
  class MyBike extends HTMLElement {
    constructor() {
      super();
    }

    _turnToViewer(e) {
      this.master.type = 'text';
      var value = e.target.value;
      var found = [...this.master.list.options].find(option => option.value == value);
      if (found) {
        this.viewer.value = found.label;
      } else {
        this.viewer.value = this.master.value;
      }
      this.viewer.type = 'text';
      this.master.type = 'hidden';
    }

    _turnToMaster(e) {
      this.viewer.type = 'hidden';
      this.master.type = 'text';
      var label = e.target.value;
      var found = [...this.master.list.options].find(option => option.label == label);
      if (found) {
        this.master.value = found.value;
      } else {
        this.master.value = this.viewer.value;
      }
      this.master.focus();
      this.master.select();
    }

    _dosearch(e) {
      var client = this.config.client;
      if (!client) {
        return;
      }
      if (lastSTO) {
        clearTimeout(lastSTO);
      }
      lastSTO = setTimeout(() => {
        client.emit('data', {
          query: 'search',
          combo: e.target.getAttribute('list'),
          module: this.config.module,
          key: this.config.key,
          value: e.target.value
        });
      }, 200);
    }

    disconnectedCallback() {
      this.innerHTML = '';
      this.master = null;
      this.viewer = null;
    }

    connectedCallback() {
      var datalistid = `${this.localName}-list-${++lastId}`;
      var datalist = document.createElement('datalist');
      this.master = document.createElement('input');
      this.viewer = document.createElement('input');

      this.viewer.addEventListener('click', this._turnToMaster.bind(this));
      this.master.addEventListener('change', this._turnToViewer.bind(this));
      this.master.addEventListener('blur', this._turnToViewer.bind(this));
      this.master.addEventListener('keyup', this._dosearch.bind(this));
      this.master.type = 'hidden';

      this.innerHTML = '';
      datalist.id = datalistid;
      this.master.setAttribute('list', datalistid);
      this.master.setAttribute('master', '');
      var df = document.createDocumentFragment();
      df.appendChild(datalist);
      df.appendChild(this.master);
      df.appendChild(this.viewer);
      this.appendChild(df);
    }
  }
  customElements.define("my-bike", MyBike);

})();
