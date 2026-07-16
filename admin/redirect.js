if (location.protocol !== 'file:' && /\/admin$/i.test(location.pathname)) {
  location.replace(`${location.pathname}/${location.search}${location.hash}`);
}
