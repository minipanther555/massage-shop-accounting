// Minimal roster UI enhancement - DnD only
window.rosterUI = {
  enhance(ul = document.getElementById('roster-list')) {
    if (!ul) return;
    
    ul.addEventListener('dragover', e => e.preventDefault());
    ul.addEventListener('drop', e => {
      e.preventDefault();
      const id = e.dataTransfer?.getData('text/plain');
      const dragged = id && document.getElementById(id);
      const target = e.target.closest('div');
      if (dragged && target && dragged !== target) ul.insertBefore(dragged, target);
      ul.dispatchEvent(new CustomEvent('roster:changed'));
    });
  }
};