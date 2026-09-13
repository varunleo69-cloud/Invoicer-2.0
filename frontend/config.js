// Empty API_BASE keeps browser requests on the same origin.
// Nginx reverse-proxies /api and /health to the backend container.
window.INVOICER_CONFIG = {
  API_BASE: ''
};
