const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Today Staff controller UI/database contract', () => {
  it('uses canonical Today Staff state/helper/add/day-off/restore endpoints', () => {
    const api = read('web-app/api.js');
    const controller = read('web-app/controllers/staff-page-controller.js');

    expect(api).toContain("return this.request('/staff/today/state');");
    expect(api).toContain("return this.request('/staff/today/helper');");
    expect(api).toContain("return this.request('/staff/today/add'");
    expect(api).toContain("return this.request('/staff/today/day-off'");
    expect(api).toContain("return this.request('/staff/today/restore'");
    expect(controller).toContain('api.getTodayStaffState()');
    expect(controller).toContain('api.getTodayStaffHelper()');
    expect(controller).toContain('api.addTodayStaff(');
    expect(controller).toContain('api.markTodayStaffDayOff(');
    expect(controller).toContain('api.restoreTodayStaffDayOff(');
  });

  it('persists set-next and reorder controls through /staff/today/reorder instead of legacy updateStaff swaps', () => {
    const controller = read('web-app/controllers/staff-page-controller.js');

    expect(controller).toContain('async function reorderVisibleRoster(fromPosition, toIndex)');
    expect(controller).toContain('const result = await api.reorderTodayStaff(orderedStaffIds)');
    expect(controller).toContain('await reorderVisibleRoster(position, 0)');
    expect(controller).toContain('await reorderVisibleRoster(position, fromIndex - 1)');
    expect(controller).toContain('await reorderVisibleRoster(position, fromIndex + 1)');
    expect(controller).not.toContain('await api.updateStaff(position');
    expect(controller).not.toContain('await api.updateStaff(previousPosition');
    expect(controller).not.toContain('await api.updateStaff(nextPosition');
  });

  it('wires drag and drop rows to the same persisted reorder path', () => {
    const controller = read('web-app/controllers/staff-page-controller.js');
    expect(controller).toContain("addEventListener('dragstart'");
    expect(controller).toContain("addEventListener('drop'");
    expect(controller).toContain('reorderVisibleRoster');
  });

  it('adds a separate inline info toggle without making draggable rows the detail trigger', () => {
    const controller = read('web-app/controllers/staff-page-controller.js');

    expect(controller).toContain('data-action="toggleInfo"');
    expect(controller).toContain('staff-info-btn');
    expect(controller).toContain('el.__staffRowData = staff');
    expect(controller).toContain('toggleStaffInfo(element.__staffRowData, element)');
    expect(controller).toContain('renderStaffInfoDetail(staff)');
    expect(controller).toContain('staff-info-detail');
    expect(controller).toContain('renderStaffDetailRows');
    expect(controller).toContain("case 'toggleInfo':");
  });

  it('escapes staff/helper/day-off strings rendered with innerHTML', () => {
    const controller = read('web-app/controllers/staff-page-controller.js');

    expect(controller).toContain('const escapeStaffHtml = (value)');
    expect(controller).toContain('const name = escapeStaffHtml(projectName(staff))');
    expect(controller).toContain('${escapeStaffHtml(row.display_name)}');
    expect(controller).toContain('${escapeStaffHtml(busyUntil)}');
    expect(controller).toContain('const statusText = escapeStaffHtml(staff.status ||');
    expect(controller).toContain('${escapeStaffHtml(label)}');
    expect(controller).toContain('${escapeStaffHtml(value)}');
  });

  it('keeps static and EJS Today Staff pages behavior-critical anchors mirrored', () => {
    const html = read('web-app/staff.html');
    const ejs = read('web-app/staff.ejs');
    const anchors = [
      'id="available-staff"',
      'id="add-to-roster-btn"',
      'id="show-add-staff-modal-btn"',
      'id="clear-roster-btn"',
      'id="today-helper-list"',
      'id="day-off-list"',
      'id="roster-list"',
      'id="confirm-clear-roster-btn"',
      'src="/controllers/staff-page-controller.js'
    ];

    anchors.forEach((anchor) => {
      expect(html).toContain(anchor);
      expect(ejs).toContain(anchor);
    });
  });
});
