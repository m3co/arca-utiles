'use strict';
(() => {
  var templateHTML = `
    <!-- THANKS A LOT HTMLImport. You're the best! -->
    <div style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; background-color: white; display: none;" id="import-apu">
      <button id="import-apu-close">x</button>
      <table id="paste-apu">
        <thead>
          <th>Tipo</th>
          <th>Descripcion</th>
          <th>Unidad</th>
          <th>Costo</th>
          <th>Rendimiento</th>
        </thead>
        <tbody>
        </tbody>
      </table>
      <form id="import-apu-form" action="#">
        <input name="APU" hidden>
        <button id="import-apu-submit" type="submit">Subir</button>
      </form>
    </div>
  `;
class ImportAUSuppliesHTML extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.innerHTML = templateHTML;

  var data = [];
  var COLUMNS = ['type', 'description', 'unit', 'cost', 'qop'];
  function spanEmpty(s) {
    return s.append('span')
      .text(d => d.value ? d.value.toString().trim() : '-')
      .on('click', d => {
        var e = d3.event;
        e.target.hidden = true;
        e.target.nextElementSibling.hidden = false;
      });
  }
  function formAndInput(span, s) {
    return s.append('form')
      .attr('hidden', true)
      .on('submit', d => {
        var e = d3.event;
        e.preventDefault();

        d.value = new FormData(e.target).toJSON().value;
        d.original[d.key] = d.value;
        span.text(d =>  d.value);

        e.target.hidden = true;
        e.target.previousElementSibling.hidden = false;
      })
      .append('input')
      .attr('name', 'value')
      .attr('value', d => d.value);
  }
  var createRedactCell = {
    type: s => formAndInput(spanEmpty(s), s).attr('list', 'Supplies_type'),
    description: s => formAndInput(spanEmpty(s), s),
    unit: s => formAndInput(spanEmpty(s), s),
    cost: s => formAndInput(spanEmpty(s), s),
    qop: s => formAndInput(spanEmpty(s), s)
  };
  function renderRow(selection) {
    var cols = selection.selectAll('td.col')
      .data((d, i) => Object.keys(d).map(c => ({
        key: c,
        value: d[c],
        original: d,
        i: i
      })));
    cols.select('span').text(d => d.value);
    cols.select('input').attr('value', d => d.value);
    cols.enter().append('td')
      .classed('col', true)
      .each(function(d) {
        createRedactCell[d.key](d3.select(this));
      });
    cols.exit().remove();
  }

  this.querySelector('#import-apu-close').addEventListener('click', e => {
    e.target.parentElement.style.display = 'none';
  });
  this.querySelector('#import-apu-form').addEventListener('submit', e => {
    e.preventDefault();
    data.map(d => COLUMNS.reduce((acc, key) => {
      acc[key] = (key === 'cost' || key === 'qop') ? Number(d[key]) : d[key];
      return acc;
    }, (() => {
      var r = {}, k = this.getAttribute('a-uid');
      r[k] = this.querySelector('#import-apu-form input[name="APU"]').value;
      return r;
    })())).map(d => ({
      query: 'insert',
      module: this.getAttribute('module'),
      row: d
    })).forEach(event => {
      client.emit('data', event);
    });
    this.querySelector('#import-apu').style.display = 'none';
    this.querySelector('#paste-apu tbody').innerHTML = '';
    data.length = 0;
  });
  this.addEventListener('paste', e => {
    data.push(...e.clipboardData.getData('text')
      .split(/[\n\r]/).filter(d => d !== '')
      .map(d => d.split(/[\t]/).reduce((acc, d, i) => {
        acc[COLUMNS[i] ? COLUMNS[i] : `xtra${i}`] = d;
        return acc;
      }, {})));
    var rows = d3.select('table#paste-apu tbody').selectAll('tr.row').data(data);
    rows.call(renderRow);
    rows.enter().append('tr')
      .classed('row', true)
      .call(renderRow);
    rows.exit().remove();
  });

  }
}
  window.customElements.define('import-a-u-supplies', ImportAUSuppliesHTML);
})();
