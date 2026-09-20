import { useEffect, useState } from 'react';

export type Route = 'practice' | 'admin' | 'history';

function currentRoute(): Route {
  const hash = window.location.hash;
  if (hash.startsWith('#/admin')) return 'admin';
  if (hash.startsWith('#/history')) return 'history';
  return 'practice';
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
