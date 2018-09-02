'use strict';
(() => {

class SelectorProjectHTML extends HTMLElement {
  constructor() {
    super();
    var projects = [];
    var lastSTO;
    function doselect(row) {
      var found = projects.find(d => d.id == row.id);
      if (!found) {
        projects.push(row);
      }
      if (lastSTO) {
        clearTimeout(lastSTO);
      }

      lastSTO = setTimeout(() => {
        render();
      });
    }

    function render() {
      var ProjectId = window.location.search.match(/ProjectId=(\d+)/);
      d3.select('#ProjectId')
        .selectAll('option')
        .data(projects)
        .enter()
        .append('option').attr('value', d => d.id).attr('label', d => d.name);

      d3.select(`#ProjectId option[value="${ProjectId ? ProjectId[1].toString() : ''}"]`).attr('selected', '');
    }

    this.render = render;
    this.doselect = doselect;
  }

  connectedCallback() {
    this.innerHTML = `
      <select id="ProjectId">
      </select>
    `;
    var ProjectId = window.location.search.match(/ProjectId=(\d+)/);
    this.querySelector('select#ProjectId').value = ProjectId ? ProjectId[1] : 1;

    this.querySelector('select#ProjectId').addEventListener('change', e => {
      window.location.search = `ProjectId=${e.target.value}`;
    });
  }

  disconnectedCallback() {
    this.innerHTML = '';
  }
}

window.customElements.define('selector-projects', SelectorProjectHTML);

})();
