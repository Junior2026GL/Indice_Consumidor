export const PAGE_SIZE = 20;

export const roleLabels = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  NORMAL: 'Usuario',
};

export const roleMeta = {
  SUPER_ADMIN: { desc: 'Control total: usuarios y configuración del sistema.', tone: 'amber' },
  ADMIN: { desc: 'Administrador del sistema.', tone: 'blue' },
  NORMAL: { desc: 'Acceso limitado.', tone: 'green' },
};
