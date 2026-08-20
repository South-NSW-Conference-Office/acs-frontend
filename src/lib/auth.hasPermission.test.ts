import { describe, it, expect } from 'vitest';
import { AuthService } from './auth';

// The panel's permission checks are copies of the API's checkPermission, and both
// were missing the same rule: `<resource>.manage` covers the other verbs on that
// resource. The API side was fixed first (acs-backend 826f681 — the Media Gallery
// 403). This is the panel's half: church_admin holds services.manage:own, the
// "Inscribe New Ministry" button sits behind PermissionGate("services.create"),
// so the API would have accepted a create the panel never offered.
//
// AuthService.hasPermission and HierarchicalPermissionContext.hasPermission carry
// the same logic; the static one is the testable copy. Keeping them identical is
// part of the point — which copy a component calls must not change the answer.

const CHURCH_ADMIN = [
  'churches.read:own',
  'churches.update:own',
  'teams.create:own',
  'teams.read:own',
  'teams.update:own',
  'teams.delete:own',
  'services.read:own',
  'services.manage:own',
  'users.manage:own',
  'dashboard.view',
  'page_content.manage',
  'media.upload',
  'media.manage',
];

describe('AuthService.hasPermission and <resource>.manage', () => {
  it('lets services.manage:own satisfy services.create', () => {
    // The regression: the create button's gate, hidden for every church admin.
    expect(AuthService.hasPermission('services.create', CHURCH_ADMIN)).toBe(true);
  });

  it('lets media.manage satisfy media.read', () => {
    // Same rule, the gate the Media Gallery page checks.
    expect(AuthService.hasPermission('media.read', CHURCH_ADMIN)).toBe(true);
  });

  it('does not leak across resources', () => {
    expect(AuthService.hasPermission('events.create', CHURCH_ADMIN)).toBe(false);
  });

  it('does not let update imply delete', () => {
    // church_admin holds churches.update:own and deliberately no churches.delete —
    // retiring a church stays with conference_admin.
    expect(AuthService.hasPermission('churches.delete', CHURCH_ADMIN)).toBe(false);
  });

  it('does not treat a non-manage verb as covering others', () => {
    expect(AuthService.hasPermission('media.delete', ['media.upload'])).toBe(
      false
    );
  });

  it('still honours the behaviours that already worked', () => {
    expect(AuthService.hasPermission('anything.at.all', ['*'])).toBe(true);
    expect(AuthService.hasPermission('teams.create', CHURCH_ADMIN)).toBe(true); // scoped exact
    expect(AuthService.hasPermission('media.delete', ['media.*'])).toBe(true);
  });

  it('still refuses an empty permission set', () => {
    expect(AuthService.hasPermission('services.create', [])).toBe(false);
  });
});
