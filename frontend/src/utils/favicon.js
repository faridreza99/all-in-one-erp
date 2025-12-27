const DEFAULT_FAVICON = '/favicon.ico';

export function setFavicon(url) {
  const faviconUrl = url || DEFAULT_FAVICON;
  
  let link = document.querySelector("link[rel~='icon']");
  
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  
  link.href = faviconUrl;
}

export function setPageTitle(title) {
  document.title = title || 'Smart Business ERP';
}
