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
  if (span._onblur instanceof Function) {
    span._onblur(row, input);
  }
  form.hidden = true;
  span.hidden = false;
}

function defineSubmitHandler(validations, readonlyFields, row, i, m) {
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
    var keys = Object.keys(row)
      .filter(d => !(readonlyFields.includes(d) || excludeFields.includes(d)) && row[d]);
    if (fd.insertInsteadOfUpdate === 'false') {
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
        row: keys.concat([fd.idkey]).reduce((acc, d) => {
          if (row[d] != null && row[d] != undefined) {
            acc[d] = row[d];
          }
          return acc;
        }, {}),
        query: 'insert',
        module: fd.module
      });
    }
  } else {
    client.emit('data', {
      row: keys.reduce((acc, d) => {
        if (row[d] != null && row[d] != undefined) {
          acc[d] = row[d];
        }
        return acc;
      }, {}),
      query: fd.query,
      module: fd.module
    });
    var defaultrow = row[Symbol.for('defaultrow')];
    var tr = form.closest('.new-row');
    Object.keys(defaultrow)
     .forEach(key => {
        row[key] = defaultrow[key];
        d3.select(tr).select(`input[name="value"][key="${key}"]`)
          .attr('value', defaultrow[key]);
        d3.select(tr).select(`span[key="${key}"]`)
          .text(defaultrow[key]);
      });
  }
}

function setupRedact(idkey, field, module, validations,
    insertInsteadOfUpdate=false, query = 'update', readonlyFields = []) {
  if (field instanceof Object) {
    if (field.readonly) {
      return function(selection) {
        selection.append('span')
          .attr('type', 'readonly')
          .attr('key', field.key)
          .text((c, j, n) =>
            renderText(c[field.key]));
      };
    }
    if (field.call instanceof Function) {
      return function(selection) {
        selection.append('span')
          .attr('type', 'custom')
          .attr('key', field.key)
          .call(field.call);
      };
    }
    if (field.hasOwnProperty('show') ||
        field.hasOwnProperty('type') ||
        field.hasOwnProperty('name')) {
    } else {
      return function(selection) { };
    }
  }
  var key = field;
  var idkey_ = field.idkey || idkey;
  var reflectidkey_ = field.reflectidkey || idkey_;
  var module_ = field.module || module;
  var isBike = false;
  var bike;
  var show = field;
  if (field instanceof Object) {
    key = field.name;
    isBike = !!field.bike;
    bike = field.bike;
    show = field.show || key;
  }
  return function redact(selection) {
    selection.append('span')
      .text(d => renderText(d[show]))
      .each(function() {
        if (isBike) {
          this._onblur = bike.onblur;
        }
      })
      .attr('type', 'redactable')
      .attr('key', key)
      .attr('keyshow', show)
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
      .on('submit', defineSubmitHandler.bind(null, validations, readonlyFields));

    var valueinput;
    if (isBike && bike instanceof Object) {
      valueinput = form.append('combobox-bike')
        .each(function() {
          this.config = bike;
        })
        .select('input[master]');
    } else {
      valueinput = form.append('input');
    }
    valueinput.attr('name', 'value')
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
      .attr('value', module_)
      .attr('type', 'hidden');;

    form.append('input')
      .attr('name', 'query')
      .attr('value', query)
      .attr('type', 'hidden');

    form.append('input')
      .attr('name', 'insertInsteadOfUpdate')
      .attr('value', insertInsteadOfUpdate)
      .attr('type', 'hidden');

    form.append('input')
      .attr('name', 'idkey')
      .attr('value', idkey_)
      .attr('type', 'hidden');

    form.append('input')
      .attr('name', 'key')
      .attr('value', key)
      .attr('type', 'hidden');

    form.append('input')
      .attr('name', 'id')
      .attr('idkey', idkey_)
      .attr('value', d => d[reflectidkey_])
      .attr('type', 'hidden');
  }
}

function setupRedacts(module, idkey, fields, tr, insertInsteadOfUpdate=false, query='update') {
  fields.forEach(field => {
    tr.append('td')
      .attr('key', field instanceof Object ? field.key : field)
      .call(setupRedact(idkey, field, module,
        fields[Symbol.for('validations')], insertInsteadOfUpdate, query,
        [].concat(fields[Symbol.for('readonlyfields')], field.excludeFields || [])));
  });
}

function setupTable(config) {
  var module = config.module;
  var header = config.header;
  var actions = config.actions;
  var fields = config.fields;
  var idkey = config.idkey;
  var validations = config.validations;
  var defaultRow = config.defaultRow || {};
  var extraRows = config.extraRows || [];
  var filter = config.filter || {};
  var preventNewEntry = config.preventNewEntry || false;
  var insertInsteadOfUpdate = config.insertInsteadOfUpdate || false;

  var storage = [];

  function clear(entry) {
    storage.length = 0;
    if (entry instanceof Object) {
      Object.assign(newEntry, entry);
    }
    render();
  }

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
    var found = storage.find(d => d[idkey] == row[idkey]);
    if (found) {
      Object.keys(found).forEach(key => {
        found[key] = row[key];
      });
      bounceRender();
    }
  }

  var doselect = config.doselect || function doselect(row) {
    var found = storage.find(d => d[idkey] == row[idkey]);
    if (!found) {
      storage.push(row);
      bounceRender();
    }
  };
  if (config.doselect instanceof Function) {
    config.doselect.storage = storage;
    config.doselect.bounceRender = bounceRender;
  }

  function doinsert(row) {
    doselect(row);
  }

  function dodelete(row) {
    var foundIndex = storage.findIndex(d => d[idkey] == row[idkey]);
    if (foundIndex > -1) {
      storage.splice(foundIndex, 1);
      bounceRender();
    }
  }

  fields[Symbol.for('readonlyfields')] = fields.filter(field => field.readonly)
    .map(field => field.key);
  fields[Symbol.for('validations')] = validations;
  var newEntry = (() => {
    var row = Object.assign({}, defaultRow);
    row[Symbol.for('defaultrow')] = defaultRow;
    return row
  })();
  var _filter = '';
  if (filter.key) {
    _filter = `[${filter.key.toLowerCase()}="${filter.value || ''}"]`;
  }

  setTimeout(() => {
    var tb, tr;
    d3.select(`table#${module}${_filter} thead tr`)
      .selectAll('th').data(header)
      .enter().append('th').text(d => d);

    if (preventNewEntry) return;
    // NEW-ENTRY
    tb = d3.select(`table#${module}${_filter} tbody`)
      .selectAll('tr.new-row')
      .data([newEntry]);

    tr = tb.enter().append('tr').classed('new-row', true);
    setupRedacts(module, idkey, fields, tr, 'insert');
  }, 0);

  function render() {
    var trs, tr;

    // SELECT
    trs = d3.selectAll(`table#${module}${_filter} tbody`)
      .selectAll(`tr.row${_filter}`).data(storage);

    // EXIT
    tr = trs.exit();
    extraRows.forEach(extraRow => tr.each(extraRow.exit));
    tr.remove();

    // UPDATE
    trs.each((d, i, m) => {
      d3.select(m[i]).selectAll('span[type="redactable"]').text((c, j, n) =>
        renderText(d[n[j].getAttribute('keyshow')]));
      d3.select(m[i]).selectAll('input[name="value"]')
        .attr('value', (c, j, n) => d[n[j].getAttribute('key')])
        .on('blur', defineBlurHandler);
      d3.select(m[i]).selectAll('input[name="id"]')
        .attr('value', (c, j, n) => d[n[j].getAttribute('idkey')]);
      d3.select(m[i]).selectAll('form')
        .on('submit', defineSubmitHandler.bind(
          null,
          fields[Symbol.for('validations')],
          fields[Symbol.for('readonlyfields')]
        ));
      actions.forEach(action =>
        d3.select(m[i]).select(action.select).call(action.setup));
      extraRows.forEach(extraRow => d3.select(m[i]).each(extraRow.update));
      d3.select(m[i]).selectAll('span[type="custom"]').each(function(c) {
        d3.select(this)
          .call(fields.find(d => d.key == this.getAttribute('key')).call);
      });
      d3.select(m[i]).selectAll('span[type="readonly"]').text((c, j, n) =>
        renderText(d[n[j].getAttribute('key')]))
    });

    // ENTER
    tr = trs.enter().append('tr').classed('row', true);
    if (filter.key) {
      tr.attr(filter.key.toLowerCase(), filter.value);
    }
    setupRedacts(module, idkey, fields, tr, insertInsteadOfUpdate);
    actions.forEach(action =>
      tr.append('td').append('button').call(action.setup));
    extraRows.forEach(extraRow => tr.each(extraRow.enter));
  }

  return {
    doselect: doselect,
    doupdate: doupdate,
    dodelete: dodelete,
    doinsert: doinsert,
    clear: clear
  };
}

window.setupTable = setupTable;
window.setupRedacts = setupRedacts;
})();
