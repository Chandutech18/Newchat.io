const getServerUrl = () => {
  const configuredUrl =
    import.meta.env.VITE_SERVER_URL ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_SOCKET_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  return `${window.location.protocol}//${window.location.hostname}:5000`;
};

export const SERVER_URL = getServerUrl();
export const API_URL = `${SERVER_URL}/api`;
