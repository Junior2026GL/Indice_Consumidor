import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../../../services/api.js';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js';
import { listUsers } from '../services/users.service.js';
import { PAGE_SIZE } from '../constants.js';

const EMPTY = { items: [], total: 0, stats: null };

/** Lista paginada de usuarios con búsqueda y filtro de rol resueltos en el servidor. */
export function useUsers() {
  const [search, setSearchValue] = useState('');
  const [roleFilter, setRoleFilterValue] = useState('TODOS');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  // Al cambiar un filtro se vuelve a la primera página.
  const setSearch = useCallback((value) => {
    setSearchValue(value);
    setPage(1);
  }, []);
  const setRoleFilter = useCallback((value) => {
    setRoleFilterValue(value);
    setPage(1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    listUsers(
      {
        q: debouncedSearch || undefined,
        rol: roleFilter !== 'TODOS' ? roleFilter : undefined,
        page,
        pageSize: PAGE_SIZE,
      },
      { signal: controller.signal }
    )
      .then((result) => {
        setData(result);
        setError('');
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return; // llegó una búsqueda más reciente
        setError(getErrorMessage(err, 'No se pudo cargar la lista de usuarios'));
        setLoading(false);
      });

    // Si se cancela, no se toca el estado: la petición nueva lo hará.
    return () => controller.abort();
  }, [debouncedSearch, roleFilter, page, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    ...data,
    loading,
    error,
    page,
    setPage,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    reload,
  };
}
