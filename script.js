// Element selection
const fileInput = document.getElementById('fileInput');
const fixturesContainer = document.getElementById('fixturesContainer');
const validateBtn = document.getElementById('validateBtn');
const messageDiv = document.getElementById('message');

let fixtures = [];
let xmlDoc = null;
let loadedFileName = 'new_patch.qxw';
let sortState = { key: null, asc: true };
let selectedRows = []; // contains the IDs of selected fixtures
let isDraggingSelect = false;
let dragSelectValue = null;

fileInput.addEventListener('change', handleFileSelect);
validateBtn.addEventListener('click', handleValidate);

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  loadedFileName = file.name || 'new_patch.qxw';
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString(e.target.result, 'text/xml');
      fixtures = parseFixtures(xmlDoc);
      renderFixturesTable(fixtures);
      validateBtn.disabled = false;
      showMessage('', '');
    } catch (err) {
      showMessage('Error reading the file.', 'error');
      validateBtn.disabled = true;
    }
  };
  reader.readAsText(file);
}

function parseFixtures(xml) {
  // Looks for fixtures in <Workspace><Engine><Fixture>
  const fixturesList = [];
  const fixtureNodes = xml.querySelectorAll('Workspace > Engine > Fixture');
  fixtureNodes.forEach(node => {
    fixturesList.push({
      id: node.querySelector('ID')?.textContent || '',
      name: node.querySelector('Name')?.textContent || '',
      universe: node.querySelector('Universe')?.textContent || '',
      address: node.querySelector('Address')?.textContent || '',
      channels: node.querySelector('Channels')?.textContent || '',
      node: node // reference for future modification
    });
  });
  return fixturesList;
}

function renderFixturesTable(fixtures) {
  if (!fixtures.length) {
    fixturesContainer.innerHTML = '<p>No fixture found.</p>';
    return;
  }
  let html = '<table><thead><tr>' +
    '<th style="width:2.5em">'
    + '<button type="button" id="checkAllBtn" title="Select all">✔</button>'
    + '<button type="button" id="uncheckAllBtn" title="Unselect all">✖</button>'
    + '</th>'
    + '<th class="sortable" data-sort="name">Name</th>'
    + '<th class="sortable" data-sort="id">ID</th>'
    + '<th class="sortable" data-sort="universe">Universe</th>'
    + '<th class="sortable" data-sort="address">DMX Address</th>'
    + '<th class="sortable" data-sort="channels">Channels</th>' +
    '</tr></thead><tbody>';
  fixtures.forEach((f, idx) => {
    const selected = selectedRows.includes(f.id);
    html += `<tr data-idx="${idx}" data-id="${f.id}">
      <td class="select-cell${selected ? ' selected' : ''}" data-idx="${idx}" data-id="${f.id}"></td>
      <td>${f.name}</td>
      <td>${f.id}</td>
      <td>
        <select class="universe-select" data-idx="${idx}">
          <option value="0"${f.universe == 0 ? ' selected' : ''}>0</option>
          <option value="1"${f.universe == 1 ? ' selected' : ''}>1</option>
          <option value="2"${f.universe == 2 ? ' selected' : ''}>2</option>
          <option value="3"${f.universe == 3 ? ' selected' : ''}>3</option>
        </select>
      </td>
      <td><input type="number" min="1" max="512" value="${parseInt(f.address, 10) + 1}" data-idx="${idx}" class="address-input"></td>
      <td>${f.channels}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  fixturesContainer.innerHTML = html;

  // Select all / Unselect all buttons
  document.getElementById('checkAllBtn').addEventListener('click', () => {
    selectedRows = fixtures.map(f => f.id);
    renderFixturesTable(fixtures);
    updateCollisionHighlight();
  });
  document.getElementById('uncheckAllBtn').addEventListener('click', () => {
    selectedRows = [];
    renderFixturesTable(fixtures);
    updateCollisionHighlight();
  });

  // Drag multi-select
  document.querySelectorAll('.select-cell').forEach(cell => {
    cell.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      const id = cell.dataset.id;
      isDraggingSelect = true;
      dragSelectValue = !selectedRows.includes(id);
      toggleSelect(id, dragSelectValue);
      e.preventDefault();
    });
    cell.addEventListener('mouseenter', e => {
      if (isDraggingSelect) {
        const id = cell.dataset.id;
        toggleSelect(id, dragSelectValue);
      }
    });
  });
  document.addEventListener('mouseup', () => {
    isDraggingSelect = false;
    dragSelectValue = null;
  });

  // Add listeners for continuous editing
  document.querySelectorAll('.address-input').forEach(input => {
    input.addEventListener('input', handleAddressInput);
  });
  document.querySelectorAll('.universe-select').forEach(select => {
    select.addEventListener('change', handleUniverseChange);
  });

  // Sorting on columns
  document.querySelectorAll('th.sortable').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (sortState.key === key) {
        sortState.asc = !sortState.asc;
      } else {
        sortState.key = key;
        sortState.asc = true;
      }
      sortFixtures(key, sortState.asc);
      renderFixturesTable(fixtures);
      updateCollisionHighlight();
    });
  });
}

function toggleSelect(id, value) {
  if (value) {
    if (!selectedRows.includes(id)) selectedRows.push(id);
  } else {
    selectedRows = selectedRows.filter(i => i !== id);
  }
  const cell = document.querySelector(`.select-cell[data-id="${id}"]`);
  if (cell) {
    if (value) cell.classList.add('selected');
    else cell.classList.remove('selected');
  }
}

function sortFixtures(key, asc) {
  fixtures.sort((a, b) => {
    let va = a[key], vb = b[key];
    if (key === 'address' || key === 'channels' || key === 'universe') {
      va = parseInt(va, 10); vb = parseInt(vb, 10);
      if (isNaN(va)) va = 0; if (isNaN(vb)) vb = 0;
    }
    if (va < vb) return asc ? -1 : 1;
    if (va > vb) return asc ? 1 : -1;
    return 0;
  });
}

function handleAddressInput(e) {
  const idx = parseInt(e.target.dataset.idx, 10);
  const val = parseInt(e.target.value, 10);
  const id = fixtures[idx].id;
  const isChecked = selectedRows.includes(id);
  if (isChecked) {
    // Group move
    const oldVal = parseInt(fixtures[idx].address, 10) + 1; // ancienne valeur affichée
    if (!isNaN(val) && !isNaN(oldVal)) {
      const delta = val - oldVal;
      selectedRows.forEach(selId => {
        if (selId !== id) {
          const i = fixtures.findIndex(f => f.id === selId);
          if (i !== -1) {
            const input = document.querySelector(`.address-input[data-idx="${i}"]`);
            const oldAddr = parseInt(fixtures[i].address, 10) + 1;
            if (!isNaN(oldAddr)) {
              input.value = oldAddr + delta;
              fixtures[i].address = oldAddr + delta - 1; // stockage -1
            }
          }
        }
      });
    }
  }
  fixtures[idx].address = val - 1; // stockage -1
  updateCollisionHighlight();
}

function handleUniverseChange(e) {
  const idx = parseInt(e.target.dataset.idx, 10);
  fixtures[idx].universe = e.target.value;
  updateCollisionHighlight();
}

function updateCollisionHighlight() {
  // Reset styles
  document.querySelectorAll('tr[data-idx]').forEach(tr => {
    tr.style.background = '';
  });
  // Detect conflicts
  const conflicts = detectConflicts(fixtures);
  conflicts.forEach(c => {
    document.querySelectorAll('tr[data-idx]').forEach(tr => {
      const idx = parseInt(tr.dataset.idx, 10);
      if (fixtures[idx].name === c.name1 || fixtures[idx].name === c.name2) {
        tr.style.background = '#ffe0e0';
      }
    });
  });
  // Check DMX  address bounds (1-512)
  document.querySelectorAll('tr[data-idx]').forEach(tr => {
    const idx = parseInt(tr.dataset.idx, 10);
    const addr = parseInt(fixtures[idx].address, 10) + 1;
    if (isNaN(addr) || addr < 1 || addr > 512) {
      tr.style.background = '#ffe0e0';
    }
  });
}

function handleValidate() {
  // Get edited values
  const inputs = document.querySelectorAll('.address-input');
  let hasInvalid = false;
  // Update addresses in fixtures
  inputs.forEach(input => {
    const idx = parseInt(input.dataset.idx, 10);
    const val = parseInt(input.value, 10);
    if (isNaN(val) || val < 1 || val > 512) {
      input.classList.add('invalid');
      hasInvalid = true;
    } else {
      input.classList.remove('invalid');
      fixtures[idx].address = val - 1; // stockage -1
    }
  });
  if (hasInvalid) {
    showMessage('Some addresses are out of range (1-512).', 'error');
    return;
  }
  // Conflict detection
  const conflicts = detectConflicts(fixtures);
  if (conflicts.length > 0) {
    let msg = 'Conflict(s) detected:<ul>';
    conflicts.forEach(c => {
      msg += `<li>Universe ${c.universe}: "${c.name1}" [${parseInt(c.range1.split('-')[0],10)+1}-${parseInt(c.range1.split('-')[1],10)+1}] and "${c.name2}" [${parseInt(c.range2.split('-')[0],10)+1}-${parseInt(c.range2.split('-')[1],10)+1}] overlap</li>`;
    });
    msg += '</ul>';
    showMessage(msg, 'error');
    return;
  }
  // If no conflict, update XML and trigger download
  updateXmlAddresses();
  downloadModifiedFile();
  showMessage('New patch validated and file downloaded.', 'success');
}

function detectConflicts(fixtures) {
  // Group by universe
  const byUniverse = {};
  fixtures.forEach(f => {
    const u = f.universe;
    if (!byUniverse[u]) byUniverse[u] = [];
    byUniverse[u].push(f);
  });
  const conflicts = [];
  Object.values(byUniverse).forEach(list => {
    // Sort by address
    list.sort((a, b) => a.address - b.address);
    for (let i = 0; i < list.length; i++) {
      const f1 = list[i];
      const start1 = parseInt(f1.address, 10);
      const end1 = start1 + parseInt(f1.channels, 10) - 1;
      for (let j = i + 1; j < list.length; j++) {
        const f2 = list[j];
        const start2 = parseInt(f2.address, 10);
        const end2 = start2 + parseInt(f2.channels, 10) - 1;
        // Overlap?
        if (start2 <= end1 && end2 >= start1) {
          conflicts.push({
            universe: f1.universe,
            name1: f1.name,
            name2: f2.name,
            range1: `${start1}-${end1}`,
            range2: `${start2}-${end2}`
          });
        }
      }
    }
  });
  return conflicts;
}

function updateXmlAddresses() {
  fixtures.forEach(f => {
    const addressNode = f.node.querySelector('Address');
    if (addressNode) addressNode.textContent = f.address;
    const universeNode = f.node.querySelector('Universe');
    if (universeNode) universeNode.textContent = f.universe;
  });
}

function downloadModifiedFile() {
  const serializer = new XMLSerializer();
  const xmlStr = serializer.serializeToString(xmlDoc);
  const blob = new Blob([xmlStr], { type: 'application/xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = loadedFileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, 100);
}

function showMessage(msg, type) {
  if (!msg) {
    messageDiv.style.display = 'none';
    return;
  }
  messageDiv.textContent = msg;
  messageDiv.className = '';
  if (type) messageDiv.classList.add(type);
  messageDiv.style.display = 'block';
} 