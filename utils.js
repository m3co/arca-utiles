'use strict';
(() => {
const excludeFields = ['id', 'createdAt'];
function renderText(t) {
  return t ? (t.toString().trim() ? t : '-') : '-';
}

function defineBlurHandler(row, i, m) {
  var input = m[i];
  var form = input.closest('form');
  var key = input.getAttribute('key');
  row[key] = input.value;

  var span = input.closest('td').querySelector('span');
  d3.select(span).text(d => renderText(input.value));
  form.hidden = true;
  span.hidden = false;
}

function defineSubmitHandler(validations, row, i, m) {
  var e = d3.event;
  e.preventDefault();

  var form = m[i];
  var span = form.closest('td').querySelector('span');
  form.hidden = true;
  span.hidden = false;

  var fd = new FormData(form).toJSON();
  row[fd.key] = fd.value;

  var valid = Object.keys(validations).reduce((acc, key) => {
    var validation = validations[key];
    function validateKey() {
      if (validation.required) {
        if (!row[key]) {
          if (!(acc instanceof Object)) {
            acc = {};
          }
          acc[key] = 'required';
        }
      }
      return acc;
    }

    if (acc instanceof Object) {
      return validateKey();
    }
    if (!acc) {
      return acc;
    }
    if (!row.hasOwnProperty(key)) {
      return acc;
    }
    return validateKey();
  }, true);

  if (valid instanceof Object) {
    console.log('errors', valid);
    return;
  }

  if (fd.query == 'update') {
    var keys = Object.keys(row).filter(d => !excludeFields.includes(d));
    client.emit('data', {
      id: fd.id,
      idkey: fd.idkey,
      key: keys,
      value: keys.map(key => row[key]),
      query: fd.query,
      module: fd.module
    });
  } else {
    client.emit('data', {
      row: Object.assign({}, row),
      query: fd.query,
      module: fd.module
    });
    var defaultrow = row[Symbol.for('defaultrow')];
    var tr = form.closest('.new-row');
    Object.keys(defaultrow)
      .forEach(key => {
        row[key] = defaultrow[key];
        tr.querySelector(`input[name="value"][key="${key}"]`)
          .value = defaultrow[key];
        tr.querySelector(`span[key="${key}"]`)
          .text = defaultrow[key];
      });
  }
}

function setupRedact(idkey, field, module, validations, query = 'update') {
  var key = field;
  if (field instanceof Object) {
    key = field.name;
  }
  return function redact(selection) {
    selection.append('span')
      .text(d => renderText(d[key]))
      .attr('key', key)
      .on('click', d => {
        var e = d3.event;
        var span = e.target;
        var form = span.parentElement.querySelector('form');
        span.hidden = true;
        form.hidden = false;

        form.querySelector('input[name="value"]').select();
      });

    var form = selection.append('form')
      .attr('hidden', '')
      .on('submit', defineSubmitHandler.bind(null, validations));

    form.append('input')
      .attr('name', 'value')
      .attr('key', key)
      .attr('value', d => d[key])
      .on('blur', defineBlurHandler)
      .each(function() {
        if (field instanceof Object) {
          Object.keys(field).forEach(key => {
            if (key != 'name') {
              this.setAttribute(key, field[key]);
            }
          });
        }
      });

    form.append('input')
      .attr('name', 'module')
      .attr('value', module)
      .attr('type', 'hidden');

    form.append('input')
      .attr('name', 'query')
      .attr('value', query)
      .attr('type', 'hidden');

    form.append('input')
      .attr('name', 'idkey')
      .attr('value', idkey)
      .attr('type', 'hidden');

    form.append('input')
      .attr('name', 'key')
      .attr('value', key)
      .attr('type', 'hidden');

    form.append('input')
      .attr('name', 'id')
      .attr('idkey', idkey)
      .attr('value', d => d[idkey])
      .attr('type', 'hidden');
  }
}

function setupRedacts(module, idkey, fields, tr, query='update') {
  fields.forEach(field => {
    tr.append('td')
      .call(setupRedact(idkey, field, module,
        fields[Symbol.for('validations')], query));
  });
}

function setupTable(module, header, actions, fields, idkey, validations, defaultRow={}) {
  var storage = [];
  var lastSTO;
  function bounceRender() {
    if (lastSTO !== undefined) {
      clearTimeout(lastSTO);
    }
    lastSTO = setTimeout(() => {
      render();
    }, 100);
  }

  function doupdate(row) {
    var found = storage.find(d => d.id == row.id);
    if (found) {
      Object.keys(found).forEach(key => {
        found[key] = row[key];
      });
      bounceRender();
    }
  }

  function doselect(row) {
    var found = storage.find(d => d.id == row.id);
    if (!found) {
      storage.push(row);
      bounceRender();
    }
  }

  function doinsert(row) {
    doselect(row);
  }

  function dodelete(row) {
    var foundIndex = storage.findIndex(d => d.id == row.id);
    if (foundIndex > -1) {
      storage.splice(foundIndex, 1);
      bounceRender();
    }
  }

  fields[Symbol.for('validations')] = validations;
  var newEntry = (() => {
    var row = Object.assign({}, defaultRow);
    row[Symbol.for('defaultrow')] = defaultRow;
    return [row];
  })();

  setTimeout(() => {
    var tb, tr;
    d3.select(`table#${module} thead tr`)
      .selectAll('th').data(header)
      .enter().append('th').text(d => d);

    // NEW-ENTRY
    tb = d3.select(`table#${module} tbody`)
      .selectAll('tr.new-row')
      .data(newEntry);

    tr = tb.enter().append('tr').classed('new-row', true);
    setupRedacts(module, idkey, fields, tr, 'insert');
  }, 0);

  function render() {
    var trs, tr;

    // SELECT
    trs = d3.select(`table#${module} tbody`)
      .selectAll('tr.row').data(storage);

    // EXIT
    trs.exit().remove();

    // UPDATE
    trs.select('span')
      .text((d, i, m) => renderText(d[m[i].getAttribute('key')]));
    trs.select('input[name="value"]')
      .attr('value', (d, i, m) => d[m[i].getAttribute('key')])
      .on('blur', defineBlurHandler);
    trs.select('input[name="id"]')
      .attr('value', (d, i, m) => d[m[i].getAttribute('idkey')]);
    trs.select('form')
      .on('submit', defineSubmitHandler.bind(null, validations));

    actions.forEach(action =>
      trs.select(action.select).call(action.setup));

    // ENTER
    tr = trs.enter().append('tr').classed('row', true);
    setupRedacts(module, idkey, fields, tr);
    actions.forEach(action =>
      tr.append('td').append('button').call(action.setup));

    // MOVE NEW-ENTRY TO THE BOTTOM
    d3.select(`table#${module} tbody tr.new-row`).each(function() {
      this.parentElement.appendChild(this);
    });
  }

  return {
    doselect: doselect,
    doupdate: doupdate,
    dodelete: dodelete,
    doinsert: doinsert
  };
}

window.setupTable = setupTable;
})();
