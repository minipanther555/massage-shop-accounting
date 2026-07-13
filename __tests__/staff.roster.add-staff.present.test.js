const fs = require('fs');
const path = require('path');

describe('Staff roster add-new-staff workflow', () => {
  const staffHtmlPath = path.join(__dirname, '..', 'web-app/staff.html');
  const controllerPath = path.join(__dirname, '..', 'web-app/controllers/staff-page-controller.js');

  test('staff roster page exposes Add New Staff modal controls', () => {
    const html = fs.readFileSync(staffHtmlPath, 'utf8');

    expect(html).toMatch(/id=["']show-add-staff-modal-btn["']/);
    expect(html).toMatch(/เพิ่มพนักงานใหม่/);
    expect(html).toMatch(/id=["']roster-staff-modal["']/);
    expect(html).toMatch(/id=["']roster-staff-form["']/);
    expect(html).toMatch(/id=["']roster-staff-name["']/);
  });

  test('staff roster labels use Thai-first daily-list language', () => {
    const html = fs.readFileSync(staffHtmlPath, 'utf8');

    expect(html).toMatch(/เลือกพนักงานที่มาทำงานวันนี้/);
    expect(html).toMatch(/รายชื่อวันนี้/);
    expect(html).toMatch(/เพิ่มเข้ารายชื่อวันนี้/);
    expect(html).toMatch(/ล้างรายชื่อทั้งหมด/);
    expect(html).toMatch(/Clear everyone from list/);
    expect(html).toMatch(/Select each staff member working today/);
    expect(html).toMatch(/Only if the name is missing/);
    expect(html).toMatch(/คิว/);
    expect(html).toMatch(/ชื่อพนักงาน/);
    expect(html).toMatch(/คิวถัดไป/);
    expect(html).toMatch(/นวดแล้ว/);
    expect(html).toMatch(/จัดลำดับ \/ ลบ/);
  });

  test('staff controller creates master staff and refreshes dropdown', () => {
    const controller = fs.readFileSync(controllerPath, 'utf8');

    expect(controller).toMatch(/showAddStaffModal/);
    expect(controller).toMatch(/addStaffForm/);
    expect(controller).toMatch(/api\.addStaff\(\{ name \}\)/);
    expect(controller).toMatch(/refreshMasterStaffDropdown\(name\)/);
    expect(controller).toMatch(/api\.getAllStaff\(\)/);
    expect(controller).toMatch(/คิวถัดไป/);
    expect(controller).toMatch(/ลากเพื่อจัดลำดับ/);
    expect(controller).toMatch(/\$\{countText\}<\/strong> <span>ครั้ง/);
  });

  test('staff roster clear action uses an in-page confirmation modal', () => {
    const html = fs.readFileSync(staffHtmlPath, 'utf8');
    const controller = fs.readFileSync(controllerPath, 'utf8');

    expect(html).toMatch(/id=["']clear-roster-btn["']/);
    expect(html).toMatch(/id=["']clear-roster-modal["']/);
    expect(html).toMatch(/id=["']confirm-clear-roster-btn["']/);
    expect(html).toMatch(/ต้องการล้างรายชื่อพนักงานวันนี้ทั้งหมดใช่ไหม/);
    expect(controller).toMatch(/openClearRosterModal/);
    expect(controller).toMatch(/closeClearRosterModal/);
    expect(controller).toMatch(/clearVisibleRoster/);
    expect(controller).toMatch(/api\.clearRoster\(\)/);
    expect(controller).not.toMatch(/confirm\('Clear all staff from today\\'s roster\?'\)/);
  });

  test('staff helper lists can collapse and restore from the roster workflow', () => {
    const html = fs.readFileSync(staffHtmlPath, 'utf8');
    const controller = fs.readFileSync(controllerPath, 'utf8');

    expect(html).toMatch(/id=["']collapse-helper-sections-btn["']/);
    expect(html).toMatch(/เสร็จแล้ว ซ่อนตัวช่วย/);
    expect(html).toMatch(/id=["']show-helper-sections-btn["']/);
    expect(html).toMatch(/แสดงตัวช่วยรายได้เมื่อวาน \/ หยุดวันนี้/);
    expect(controller).toMatch(/setHelperSectionsCollapsed/);
    expect(controller).toMatch(/applyHelperCollapseState/);
    expect(controller).toMatch(/helpers-collapsed/);
  });
});
