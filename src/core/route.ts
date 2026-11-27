import type { Route } from '../shared/types.ts';

export function routeOf(pathname: string): Route {
  return {
    enabled: !/^\/stories(\/|$)/.test(pathname),
    feed: /^\/reels(\/|$)/.test(pathname),
  };
}
