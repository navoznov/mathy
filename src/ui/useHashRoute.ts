import { useEffect, useState } from 'react';

export type Route = 'practice' | 'admin';

function currentRoute(): Route {
  return window.location.hash.startsWith('#/admin') ? 'admin' : 'practice';
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
