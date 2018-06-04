'use strict';
(() => {

class SelectorContractorHTML extends HTMLElement {
  constructor() {
    super();
    var contractors = [];
    var lastSTO;
    function doselect(row) {
      var found = contractors.find(d => d.id == row.id);
      if (!found) {
        contractors.push(row);
      }
      if (lastSTO) {
        clearTimeout(lastSTO);
      }

      lastSTO = setTimeout(() => {
        render();
      });
    }

    function render() {
      d3.select('#ContractorId')
        .selectAll('option')
        .data(contractors)
        .enter()
        .append('option').attr('value', d => d.id).attr('label', d => d.fullname);

      d3.select(`#ContractorId option[value="${
        location.search.match(/\d+$/).toString()}"]`).attr('selected', '');
    }

    this.render = render;
    this.doselect = doselect;
  }

  connectedCallback() {
    this.innerHTML = `
      <select id="ContractorId">
      </select>
    `;
    var ContractorId = window.location.search.match(/\?ContractorId=(\d+)$/);
    this.querySelector('select#ContractorId').value = ContractorId ? ContractorId[1] : 1;

    this.querySelector('select#ContractorId').addEventListener('change', e => {
      window.location.search = `ContractorId=${e.target.value}`;
    });
  }

  disconnectedCallback() {
    this.innerHTML = '';
  }
}

window.customElements.define('selector-contractors', SelectorContractorHTML);

})();
