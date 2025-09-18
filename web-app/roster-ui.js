// web-app/roster-ui.js
(function () {
  function wireRosterUI(doc = document) {
    const ul = doc.getElementById('roster-list');
    if (!ul) return;

    // Basic button actions
    const btnClear = doc.getElementById('btn-clear-roster');
    const btnSave  = doc.getElementById('btn-save-roster');
    const btnSort  = doc.getElementById('btn-sort-roster');

    btnClear?.addEventListener('click', () => {
      ul.innerHTML = '';
      ul.dispatchEvent(new CustomEvent('roster:changed'));
    });

    btnSort?.addEventListener('click', () => {
      const items = Array.from(ul.querySelectorAll('li'));
      items.sort((a, b) => a.dataset.name.localeCompare(b.dataset.name, 'en'));
      ul.innerHTML = '';
      for (const li of items) ul.appendChild(li);
      ul.dispatchEvent(new CustomEvent('roster:changed'));
    });

    btnSave?.addEventListener('click', () => {
      // fire-and-forget; controller listens and persists
      ul.dispatchEvent(new CustomEvent('roster:save'));
    });

    // Drag & drop (native)
    ul.querySelectorAll('li').forEach(enableDraggable);
    ul.addEventListener('dragover', (e) => e.preventDefault());
    ul.addEventListener('drop', (e) => {
      e.preventDefault();
      const id = e.dataTransfer?.getData('text/plain');
      const dragged = id && doc.getElementById(id);
      const dropTarget = e.target.closest('li');
      if (dragged && dropTarget && dragged !== dropTarget) {
        ul.insertBefore(dragged, dropTarget);
        ul.dispatchEvent(new CustomEvent('roster:changed'));
      }
    });
  }

  function enableDraggable(li) {
    li.setAttribute('draggable', 'true');
    if (!li.id) li.id = 'roster-' + Math.random().toString(36).slice(2);
    li.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', li.id);
    });
    // remove button
    if (!li.querySelector('.remove')) {
      const btn = document.createElement('button');
      btn.className = 'btn remove';
      btn.type = 'button';
      btn.textContent = '✕';
      btn.title = 'Remove from roster';
      btn.addEventListener('click', () => {
        li.parentElement?.removeChild(li);
        li.parentElement?.dispatchEvent(new CustomEvent('roster:changed'));
      });
      li.appendChild(btn);
    }
  }

  // Expose to controller
  window.rosterUI = { wireRosterUI, enableDraggable };
})();
