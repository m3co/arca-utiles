'use strict';
(() => {
  var lastId = 0;
  var lastSTO;
  class ComboboxBikeHTMLelement extends HTMLElement {
    constructor() {
      super();
    }

    _turnToViewer(e) {
      this.viewer.preventDoSearch = true;
      if (lastSTO) {
        clearTimeout(lastSTO);
      }
      this.master.type = 'text';
      var value = e.target.value;
      var found = [...this.master.list.options].find(option => option.value == value);
      if (found) {
        this.master._found = found;
        this.viewer.value = found.label;
        this.viewer._value = found.value;
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
      var value = e.target._value;
      var found = [...this.master.list.options].find(option => option.value == value);
      if (found) {
        this.master.value = found.value;
        this.master._found = found;
      } else {
        if (value) {
          this.master.value = value;
        }
      }
      this.master.focus();
      this.master.select();
    }

    _dosearch(e) {
      if (this.viewer.preventDoSearch) {
        this.viewer.preventDoSearch = false;
        return;
      }
      var client = this.config.client;
      if (!client) {
        return;
      }
      if (lastSTO) {
        clearTimeout(lastSTO);
      }
      lastSTO = setTimeout(() => {
        var req = {
          query: 'search',
          combo: e.target.getAttribute('list'),
          module: this.config.module,
          key: this.config.key,
          value: e.target.value
        };
        if (this.config.filter instanceof Object) {
          req.filter = this.config.filter;
        }
        client.emit('data', req);
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
  customElements.define("combobox-bike", ComboboxBikeHTMLelement);

})();
